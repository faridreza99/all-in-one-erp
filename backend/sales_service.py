"""
Shared sale creation service for POS and due request approvals.
Ensures consistent validation, stock updates, and side effects.
"""

from datetime import datetime, timezone, timedelta
from uuid import uuid4
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


class SaleActorContext(BaseModel):
    """Context about the user/system creating the sale"""
    user_id: str
    email: str
    role: str
    tenant_id: str
    tenant_slug: Optional[str] = None


class SaleCreationOverrides(BaseModel):
    """Optional overrides for sale creation"""
    sale_id: Optional[str] = None
    sale_number: Optional[str] = None
    invoice_no: Optional[str] = None
    reference: Optional[str] = None
    skip_stock_update: bool = False


class SaleItemInput(BaseModel):
    """Normalized sale item input"""
    product_id: str
    name: str
    price: float
    quantity: int
    unit: Optional[str] = "pcs"
    serial_number: Optional[str] = None


class SaleCreationInput(BaseModel):
    """Normalized input for sale creation"""
    items: List[SaleItemInput] = Field(default_factory=list)
    branch_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    discount: float = 0.0
    tax: float = 0.0
    paid_amount: Optional[float] = None
    payment_method: str = "cash"
    include_warranty_terms: bool = False
    warranty_terms: Optional[str] = None


class SaleCreationResult(BaseModel):
    """Result of sale creation"""
    sale_id: str
    sale_number: str
    invoice_no: str
    subtotal: float
    discount: float
    tax: float
    total: float
    paid_amount: float
    balance_due: float
    payment_status: str
    customer_id: Optional[str] = None
    warranty_ids: List[str] = Field(default_factory=list)
    low_stock_product_ids: List[str] = Field(default_factory=list)


async def perform_sale_creation(
    *,
    target_db,
    actor: SaleActorContext,
    sale_input: SaleCreationInput,
    overrides: Optional[SaleCreationOverrides] = None
) -> SaleCreationResult:
    """
    Shared sale creation logic used by POS and due request approvals.
    
    Handles:
    - Stock validation and updates
    - Low stock notifications
    - Customer auto-creation/update
    - Sale creation
    - Warranty auto-creation
    - Payment record creation
    - Customer due tracking
    - Unpaid invoice notifications
    """
    overrides = overrides or SaleCreationOverrides()
    
    # Calculate totals
    subtotal = sum(item.price * item.quantity for item in sale_input.items)
    total = subtotal - sale_input.discount + sale_input.tax
    
    # Validate and handle paid amount
    if sale_input.paid_amount is not None:
        if sale_input.paid_amount < 0:
            raise ValueError("Payment amount cannot be negative")
        if sale_input.paid_amount > total:
            raise ValueError(f"Payment amount cannot exceed total ({total:.2f})")
        paid_amount = sale_input.paid_amount
    else:
        paid_amount = total
    
    balance_due = total - paid_amount
    
    # Determine payment status (using enum values that match server.py's PaymentStatus)
    if paid_amount >= total:
        payment_status = "paid"
    elif paid_amount > 0:
        payment_status = "partially_paid"
    else:
        payment_status = "unpaid"
    
    # Generate sale number and invoice number (unless overridden)
    if overrides.sale_number and overrides.invoice_no:
        sale_number = overrides.sale_number
        invoice_no = overrides.invoice_no
    else:
        count = await target_db.sales.count_documents({"tenant_id": actor.tenant_id})
        sale_number = overrides.sale_number or f"SALE-{count + 1:06d}"
        invoice_no = overrides.invoice_no or f"INV-{count + 1:06d}"
    
    # Validate stock availability before proceeding
    for item in sale_input.items:
        if sale_input.branch_id:
            product_branch = await target_db.product_branches.find_one({
                "product_id": item.product_id,
                "branch_id": sale_input.branch_id,
                "tenant_id": actor.tenant_id
            }, {"_id": 0, "stock_quantity": 1})
            
            available_stock = product_branch.get("stock_quantity", 0) if product_branch else 0
            if available_stock < item.quantity:
                raise ValueError(
                    f"Insufficient stock for {item.name}. Available: {available_stock}, Requested: {item.quantity}"
                )
        else:
            product = await target_db.products.find_one({
                "id": item.product_id,
                "tenant_id": actor.tenant_id
            }, {"_id": 0, "stock": 1})
            
            available_stock = product.get("stock", 0) if product else 0
            if available_stock < item.quantity:
                raise ValueError(
                    f"Insufficient stock for {item.name}. Available: {available_stock}, Requested: {item.quantity}"
                )
    
    # Update stock (unless skipped for idempotent retries)
    if not overrides.skip_stock_update:
        for item in sale_input.items:
            if sale_input.branch_id:
                result = await target_db.product_branches.update_one(
                    {"product_id": item.product_id, "branch_id": sale_input.branch_id, "tenant_id": actor.tenant_id},
                    {"$inc": {"stock_quantity": -item.quantity}}
                )
                if result.matched_count == 0:
                    raise ValueError(f"Product {item.product_id} not assigned to branch or insufficient stock")
            else:
                await target_db.products.update_one(
                    {"id": item.product_id, "tenant_id": actor.tenant_id},
                    {"$inc": {"stock": -item.quantity}}
                )
    
    # Check for low stock and create notifications
    low_stock_product_ids = []
    for item in sale_input.items:
        if sale_input.branch_id:
            product_branch = await target_db.product_branches.find_one({
                "product_id": item.product_id,
                "branch_id": sale_input.branch_id,
                "tenant_id": actor.tenant_id
            }, {"_id": 0, "stock_quantity": 1})
            
            branch_stock = product_branch.get("stock_quantity", 0) if product_branch else 0
            if branch_stock <= 5:
                product = await target_db.products.find_one(
                    {"id": item.product_id, "tenant_id": actor.tenant_id},
                    {"_id": 0, "name": 1}
                )
                if product:
                    existing_notif = await target_db.notifications.find_one({
                        "tenant_id": actor.tenant_id,
                        "type": "low_stock",
                        "reference_id": f"{item.product_id}_{sale_input.branch_id}"
                    })
                    
                    if not existing_notif:
                        notif_doc = {
                            "id": str(uuid4()),
                            "tenant_id": actor.tenant_id,
                            "type": "low_stock",
                            "reference_id": f"{item.product_id}_{sale_input.branch_id}",
                            "message": f"Low stock alert: {product['name']} (Branch) - Only {branch_stock} units left!",
                            "is_sticky": False,
                            "is_read": False,
                            "created_at": datetime.utcnow().isoformat(),
                            "updated_at": datetime.utcnow().isoformat()
                        }
                        await target_db.notifications.insert_one(notif_doc)
                        low_stock_product_ids.append(item.product_id)
        else:
            product = await target_db.products.find_one(
                {"id": item.product_id, "tenant_id": actor.tenant_id},
                {"_id": 0, "name": 1, "stock": 1}
            )
            
            if product and product.get("stock", 0) <= 5:
                existing_notif = await target_db.notifications.find_one({
                    "tenant_id": actor.tenant_id,
                    "type": "low_stock",
                    "reference_id": item.product_id
                })
                
                if not existing_notif:
                    notif_doc = {
                        "id": str(uuid4()),
                        "tenant_id": actor.tenant_id,
                        "type": "low_stock",
                        "reference_id": item.product_id,
                        "message": f"Low stock alert: {product['name']} - Only {product['stock']} units left!",
                        "is_sticky": False,
                        "is_read": False,
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    await target_db.notifications.insert_one(notif_doc)
                    low_stock_product_ids.append(item.product_id)
    
    # Auto-create or update customer
    actual_customer_id = sale_input.customer_id
    if sale_input.customer_name and (sale_input.customer_phone or sale_input.customer_address):
        existing_customer = None
        if sale_input.customer_phone:
            existing_customer = await target_db.customers.find_one({
                "tenant_id": actor.tenant_id,
                "phone": sale_input.customer_phone
            }, {"_id": 0})
        
        if not existing_customer and sale_input.customer_name:
            existing_customer = await target_db.customers.find_one({
                "tenant_id": actor.tenant_id,
                "name": sale_input.customer_name
            }, {"_id": 0})
        
        if existing_customer:
            actual_customer_id = existing_customer['id']
            update_data = {}
            
            if sale_input.customer_address and sale_input.customer_address != existing_customer.get('address'):
                update_data['address'] = sale_input.customer_address
            if sale_input.customer_phone and sale_input.customer_phone != existing_customer.get('phone'):
                update_data['phone'] = sale_input.customer_phone
            
            update_data['total_purchases'] = existing_customer.get('total_purchases', 0) + total
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            if update_data:
                await target_db.customers.update_one(
                    {"id": actual_customer_id, "tenant_id": actor.tenant_id},
                    {"$set": update_data}
                )
        else:
            new_customer_id = str(uuid4())
            new_customer = {
                "id": new_customer_id,
                "tenant_id": actor.tenant_id,
                "name": sale_input.customer_name,
                "phone": sale_input.customer_phone or "",
                "email": None,
                "address": sale_input.customer_address or "",
                "credit_limit": 0.0,
                "total_purchases": total,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            await target_db.customers.insert_one(new_customer)
            actual_customer_id = new_customer_id
    
    # Create sale document (using dict instead of Pydantic model to avoid circular imports)
    sale_id = overrides.sale_id or str(uuid4())
    now = datetime.utcnow()
    
    # Inherit warranty terms from products if not explicitly provided
    include_warranty_terms = sale_input.include_warranty_terms
    warranty_terms = sale_input.warranty_terms
    
    # Always check product warranty terms if sale doesn't have explicit warranty text
    if not warranty_terms:
        product_ids = [item.product_id for item in sale_input.items]
        if product_ids:
            products_with_warranty = await target_db.products.find(
                {
                    "id": {"$in": product_ids},
                    "tenant_id": actor.tenant_id,
                    "include_warranty_terms": True,
                    "warranty_terms": {"$ne": None}
                },
                {"_id": 0, "warranty_terms": 1}
            ).to_list(len(product_ids))
            
            if products_with_warranty:
                # Use the first product's warranty terms
                include_warranty_terms = True
                warranty_terms = products_with_warranty[0].get("warranty_terms")
    
    sale_doc = {
        "id": sale_id,
        "tenant_id": actor.tenant_id,
        "sale_number": sale_number,
        "invoice_no": invoice_no,
        "branch_id": sale_input.branch_id,
        "customer_id": actual_customer_id,
        "customer_name": sale_input.customer_name,
        "customer_phone": sale_input.customer_phone,
        "customer_address": sale_input.customer_address,
        "items": [item.model_dump() for item in sale_input.items],
        "subtotal": subtotal,
        "discount": sale_input.discount,
        "tax": sale_input.tax,
        "total": total,
        "amount_paid": paid_amount,
        "balance_due": balance_due,
        "status": "completed",
        "payment_status": payment_status,
        "payment_method": sale_input.payment_method.lower(),
        "reference": overrides.reference,
        "created_by": actor.email,
        "include_warranty_terms": include_warranty_terms,
        "warranty_terms": warranty_terms,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await target_db.sales.insert_one(sale_doc)
    
    # Auto-create warranty records
    warranty_ids = []
    try:
        for item in sale_input.items:
            product = await target_db.products.find_one(
                {"id": item.product_id, "tenant_id": actor.tenant_id},
                {"_id": 0}
            )
            
            if product and product.get('warranty_months', 0) > 0:
                from warranty_utils import generate_warranty_token
                
                warranty_count = await target_db.warranty_records.count_documents({"tenant_id": actor.tenant_id})
                warranty_code = f"W-{datetime.now().year}-{warranty_count + 1:07d}"
                warranty_id = str(uuid4())
                
                purchase_date = datetime.now(timezone.utc)
                warranty_expiry = purchase_date + timedelta(days=product['warranty_months'] * 30)
                warranty_token = generate_warranty_token(warranty_id, actor.tenant_id)
                
                warranty_record = {
                    "id": warranty_id,
                    "tenant_id": actor.tenant_id,
                    "warranty_code": warranty_code,
                    "warranty_token": warranty_token,
                    "invoice_id": sale_id,
                    "invoice_no": invoice_no,
                    "sale_id": sale_id,
                    "product_id": product['id'],
                    "product_name": product.get('name', ''),
                    "serial_number": item.serial_number or product.get('imei') or product.get('serial_number'),
                    "customer_id": actual_customer_id,
                    "customer_name": sale_input.customer_name,
                    "customer_phone": sale_input.customer_phone,
                    "customer_email": None,
                    "supplier_id": product.get('supplier_id'),
                    "supplier_name": product.get('supplier_name'),
                    "purchase_date": purchase_date.isoformat(),
                    "warranty_period_months": product['warranty_months'],
                    "warranty_start_date": purchase_date.isoformat(),
                    "warranty_expiry_date": warranty_expiry.isoformat(),
                    "current_status": "active",
                    "replaced_by_warranty_id": None,
                    "transferable": False,
                    "fraud_score": 0.0,
                    "created_by": actor.email,
                    "updated_by": None,
                    "created_at": purchase_date.isoformat(),
                    "updated_at": purchase_date.isoformat()
                }
                
                await target_db.warranty_records.insert_one(warranty_record)
                warranty_ids.append(warranty_id)
                logger.info(f"Created warranty {warranty_code} in {target_db.name}")
                
                # Create initial warranty event
                warranty_event = {
                    "id": str(uuid4()),
                    "tenant_id": actor.tenant_id,
                    "warranty_id": warranty_id,
                    "event_type": "status_changed",
                    "actor_type": "system",
                    "actor_id": None,
                    "actor_name": "System",
                    "note": "Warranty activated on purchase",
                    "attachments": [],
                    "meta": {"warranty_code": warranty_code, "qr_url": f"https://myerp.com/w/{warranty_token}"},
                    "created_at": purchase_date.isoformat(),
                    "updated_at": purchase_date.isoformat()
                }
                
                await target_db.warranty_events.insert_one(warranty_event)
    except Exception as e:
        logger.warning(f"Warranty auto-creation failed for sale {sale_id}: {e}")
    
    # Create payment record
    if paid_amount > 0:
        payment_doc = {
            "id": str(uuid4()),
            "tenant_id": actor.tenant_id,
            "sale_id": sale_id,
            "amount": paid_amount,
            "method": sale_input.payment_method.lower(),
            "received_at": now.isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await target_db.payments.insert_one(payment_doc)
    
    # Create customer due if partial payment
    if paid_amount < total and sale_input.customer_name:
        due_amount = total - paid_amount
        customer_due_doc = {
            "id": str(uuid4()),
            "tenant_id": actor.tenant_id,
            "customer_name": sale_input.customer_name,
            "sale_id": sale_id,
            "sale_number": sale_number,
            "total_amount": total,
            "paid_amount": paid_amount,
            "due_amount": due_amount,
            "transaction_date": now.isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await target_db.customer_dues.insert_one(customer_due_doc)
    
    # Create sticky notification for unpaid/partially paid invoices
    if balance_due > 0:
        unpaid_notif = {
            "id": str(uuid4()),
            "tenant_id": actor.tenant_id,
            "type": "unpaid_invoice",
            "sale_id": sale_id,
            "message": f"Invoice {invoice_no} has outstanding balance: ৳{balance_due:.2f}",
            "is_sticky": True,
            "is_read": False,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await target_db.notifications.insert_one(unpaid_notif)
    
    return SaleCreationResult(
        sale_id=sale_id,
        sale_number=sale_number,
        invoice_no=invoice_no,
        subtotal=subtotal,
        discount=sale_input.discount,
        tax=sale_input.tax,
        total=total,
        paid_amount=paid_amount,
        balance_due=balance_due,
        payment_status=payment_status,
        customer_id=actual_customer_id,
        warranty_ids=warranty_ids,
        low_stock_product_ids=low_stock_product_ids
    )
