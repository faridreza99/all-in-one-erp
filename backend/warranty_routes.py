from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid

from warranty_models import (
    WarrantyRecord, WarrantyEvent, SupplierAction, FinancialTransaction,
    ClaimCreate, InspectionCreate, SupplierActionCreate, WarrantyResolveResponse,
    WarrantyStatus, EventType, ActorType, SupplierActionType, SupplierActionStatus
)
from warranty_utils import (
    generate_warranty_token, verify_and_extract_token,
    calculate_days_remaining, is_warranty_valid, detect_fraud_indicators
)
from tenant_dependency import TenantContext, get_tenant_context, get_current_user_from_token
from db_connection import resolve_tenant_db, get_admin_db

MONGO_URL = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.erp_database

warranty_router = APIRouter()

async def create_warranty_event(
    tenant_db,
    warranty_id: str,
    event_type: EventType,
    actor_type: ActorType,
    tenant_id: str,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    note: Optional[str] = None,
    attachments: Optional[List[str]] = None,
    meta: Optional[dict] = None
):
    event = WarrantyEvent(
        tenant_id=tenant_id,
        warranty_id=warranty_id,
        event_type=event_type,
        actor_type=actor_type,
        actor_id=actor_id,
        actor_name=actor_name,
        note=note,
        attachments=attachments or [],
        meta=meta or {}
    )
    
    event_dict = event.model_dump()
    event_dict['created_at'] = event_dict['created_at'].isoformat()
    event_dict['updated_at'] = event_dict['updated_at'].isoformat()
    
    await tenant_db.warranty_events.insert_one(event_dict)
    return event

async def update_warranty_status(
    tenant_db,
    warranty_id: str,
    new_status: WarrantyStatus,
    tenant_id: str,
    actor_type: ActorType = ActorType.SYSTEM,
    actor_id: Optional[str] = None,
    note: Optional[str] = None
):
    result = await tenant_db.warranty_records.update_one(
        {"id": warranty_id, "tenant_id": tenant_id},
        {
            "$set": {
                "current_status": new_status.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count > 0:
        await create_warranty_event(
            tenant_db,
            warranty_id,
            EventType.STATUS_CHANGED,
            actor_type,
            tenant_id,
            actor_id=actor_id,
            note=note or f"Status changed to {new_status.value}",
            meta={"new_status": new_status.value}
        )
    
    return result.modified_count > 0

@warranty_router.post("/warranty/create")
async def create_warranty_from_sale(
    sale_id: str,
    product_id: str,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    tenant_db = tenant_ctx.db
    tenant_id = tenant_ctx.user.get("tenant_id")
    
    sale = await tenant_db.sales.find_one(
        {"id": sale_id, "tenant_id": tenant_id},
        {"_id": 0}
    )
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    product = await tenant_db.products.find_one(
        {"id": product_id, "tenant_id": tenant_id},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    warranty_months = product.get('warranty_months', 0)
    if warranty_months <= 0:
        raise HTTPException(status_code=400, detail="Product does not have warranty")
    
    count = await tenant_db.warranty_records.count_documents({"tenant_id": tenant_id})
    warranty_code = f"W-{datetime.now().year}-{count + 1:07d}"
    
    purchase_date = datetime.now(timezone.utc)
    if isinstance(sale.get('created_at'), str):
        purchase_date = datetime.fromisoformat(sale['created_at'])
    
    warranty_expiry = purchase_date + timedelta(days=warranty_months * 30)
    
    warranty_id_temp = str(uuid.uuid4())
    
    warranty = WarrantyRecord(
        id=warranty_id_temp,
        tenant_id=tenant_id,
        warranty_code=warranty_code,
        warranty_token="",
        invoice_id=sale.get('id'),
        invoice_no=sale.get('invoice_no', ''),
        sale_id=sale_id,
        product_id=product_id,
        product_name=product.get('name', ''),
        serial_number=product.get('imei') or product.get('serial_number'),
        customer_name=sale.get('customer_name'),
        customer_phone=sale.get('customer_phone'),
        customer_email=sale.get('customer_email'),
        supplier_id=product.get('supplier_id'),
        supplier_name=product.get('supplier_name'),
        purchase_date=purchase_date,
        warranty_period_months=warranty_months,
        warranty_start_date=purchase_date,
        warranty_expiry_date=warranty_expiry,
        current_status=WarrantyStatus.ACTIVE,
        created_by=sale.get('created_by')
    )
    
    warranty_token = generate_warranty_token(warranty.id, tenant_id)
    warranty.warranty_token = warranty_token
    
    warranty_dict = warranty.model_dump()
    warranty_dict['created_at'] = warranty_dict['created_at'].isoformat()
    warranty_dict['updated_at'] = warranty_dict['updated_at'].isoformat()
    warranty_dict['purchase_date'] = warranty_dict['purchase_date'].isoformat()
    warranty_dict['warranty_start_date'] = warranty_dict['warranty_start_date'].isoformat()
    warranty_dict['warranty_expiry_date'] = warranty_dict['warranty_expiry_date'].isoformat()
    
    await tenant_db.warranty_records.insert_one(warranty_dict)
    
    await create_warranty_event(
        tenant_db,
        warranty.id,
        EventType.STATUS_CHANGED,
        ActorType.SYSTEM,
        tenant_id,
        note="Warranty activated",
        meta={"warranty_code": warranty_code}
    )
    
    return {
        "success": True,
        "warranty_id": warranty.id,
        "warranty_code": warranty_code,
        "warranty_token": warranty_token,
        "qr_url": f"https://myerp.com/w/{warranty_token}"
    }

@warranty_router.get("/warranty/resolve")
async def resolve_warranty_qr(q: str = Query(..., description="Warranty token from QR code")):
    """
    Public endpoint for QR code resolution.
    Extracts tenant_id from token to query correct tenant database.
    """
    # Verify token signature and extract payload
    token_payload = verify_and_extract_token(q)
    if not token_payload:
        raise HTTPException(status_code=403, detail="Invalid or forged warranty token")
    
    tenant_id = token_payload['tenant_id']
    warranty_id_from_token = token_payload['warranty_id']
    
    # Get tenant registry info to find tenant_slug
    admin_db = get_admin_db()
    tenant_registry = await admin_db.tenants_registry.find_one(
        {"tenant_id": tenant_id, "status": "active"},
        {"_id": 0}
    )
    
    # Resolve tenant database
    if tenant_registry and tenant_registry.get('slug'):
        tenant_db = await resolve_tenant_db(tenant_registry['slug'])
    else:
        # Fallback to default DB for legacy tenants
        tenant_db = db
    
    # Query warranty from tenant-specific database
    warranty = await tenant_db.warranty_records.find_one(
        {"id": warranty_id_from_token, "tenant_id": tenant_id},
        {"_id": 0}
    )
    
    if not warranty:
        raise HTTPException(status_code=404, detail="Warranty not found")
    
    # Additional validation: ensure warranty_token in DB matches the scanned token
    if warranty.get('warranty_token') != q:
        raise HTTPException(status_code=403, detail="Token mismatch - possible replay attack")
    
    if isinstance(warranty.get('warranty_expiry_date'), str):
        expiry_date = datetime.fromisoformat(warranty['warranty_expiry_date'])
    else:
        expiry_date = warranty['warranty_expiry_date']
    
    days_remaining = calculate_days_remaining(expiry_date)
    is_valid_warranty = is_warranty_valid(expiry_date)
    
    can_claim = warranty['current_status'] == 'active' and is_valid_warranty
    
    allowed_actions = []
    if can_claim:
        allowed_actions.append("register_claim")
    elif warranty['current_status'] == 'active':
        allowed_actions.append("request_manual_review")
    
    return WarrantyResolveResponse(
        warranty_id=warranty['id'],
        warranty_code=warranty['warranty_code'],
        product={
            "id": warranty['product_id'],
            "name": warranty['product_name'],
            "serial_number": warranty.get('serial_number')
        },
        purchase_date=warranty['purchase_date'] if isinstance(warranty['purchase_date'], str) else warranty['purchase_date'].isoformat(),
        expiry_date=warranty['warranty_expiry_date'] if isinstance(warranty['warranty_expiry_date'], str) else warranty['warranty_expiry_date'].isoformat(),
        status=warranty['current_status'],
        can_claim=can_claim,
        allowed_actions=allowed_actions,
        days_remaining=days_remaining if days_remaining > 0 else None,
        customer_name=warranty.get('customer_name')
    )

@warranty_router.post("/warranty/{warranty_id}/claim")
async def register_claim(
    warranty_id: str,
    claim_data: ClaimCreate,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    tenant_db = tenant_ctx.db
    tenant_id = tenant_ctx.user.get("tenant_id")
    
    warranty = await tenant_db.warranty_records.find_one(
        {"id": warranty_id, "tenant_id": tenant_id},
        {"_id": 0}
    )
    
    if not warranty:
        raise HTTPException(status_code=404, detail="Warranty not found")
    
    if warranty['current_status'] not in ['active', 'expired']:
        raise HTTPException(status_code=400, detail="Warranty already has an active claim")
    
    if isinstance(warranty.get('warranty_expiry_date'), str):
        expiry_date = datetime.fromisoformat(warranty['warranty_expiry_date'])
    else:
        expiry_date = warranty['warranty_expiry_date']
    
    is_valid = is_warranty_valid(expiry_date, grace_days=7)
    
    recent_claims = await tenant_db.warranty_events.find({
        "warranty_id": warranty_id,
        "event_type": "claim_registered",
        "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()}
    }).to_list(100)
    
    fraud_score = detect_fraud_indicators(warranty, claim_data.model_dump(), recent_claims)
    
    if fraud_score > 0.7:
        await update_warranty_status(
            tenant_db,
            warranty_id,
            WarrantyStatus.DECLINED,
            tenant_id,
            ActorType.SYSTEM,
            note="Claim declined due to fraud detection"
        )
        raise HTTPException(status_code=400, detail="Claim flagged for fraud. Please contact support.")
    
    new_status = WarrantyStatus.CLAIMED
    if not is_valid:
        new_status = WarrantyStatus.UNDER_INSPECTION
    
    await update_warranty_status(
        tenant_db,
        warranty_id,
        new_status,
        tenant_id,
        ActorType.CUSTOMER,
        note="Claim registered by customer"
    )
    
    await tenant_db.warranty_records.update_one(
        {"id": warranty_id, "tenant_id": tenant_id},
        {"$set": {"fraud_score": fraud_score}}
    )
    
    event = await create_warranty_event(
        tenant_db,
        warranty_id,
        EventType.CLAIM_REGISTERED,
        ActorType.CUSTOMER,
        tenant_id,
        actor_name=claim_data.customer_name,
        note=claim_data.reported_issue,
        attachments=claim_data.images,
        meta={
            "customer_phone": claim_data.customer_phone,
            "customer_email": claim_data.customer_email,
            "preferred_action": claim_data.preferred_action,
            "fraud_score": fraud_score,
            "is_valid": is_valid
        }
    )
    
    return {
        "success": True,
        "claim_event_id": event.id,
        "warranty_status": new_status.value,
        "next_steps": "Your claim has been registered. Our team will inspect and contact you within 24 hours."
    }

@warranty_router.post("/warranty/{warranty_id}/inspection/start")
async def start_inspection(
    warranty_id: str,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    tenant_db = tenant_ctx.db
    tenant_id = tenant_ctx.user.get("tenant_id")
    current_user = tenant_ctx.user
    
    warranty = await tenant_db.warranty_records.find_one(
        {"id": warranty_id, "tenant_id": tenant_id},
        {"_id": 0}
    )
    
    if not warranty:
        raise HTTPException(status_code=404, detail="Warranty not found")
    
    await update_warranty_status(
        tenant_db,
        warranty_id,
        WarrantyStatus.UNDER_INSPECTION,
        tenant_id,
        ActorType.STAFF,
        actor_id=current_user.get('id'),
        note=f"Inspection started by {current_user.get('full_name')}"
    )
    
    event = await create_warranty_event(
        tenant_db,
        warranty_id,
        EventType.INSPECTION_STARTED,
        ActorType.STAFF,
        tenant_id,
        actor_id=current_user.get('id'),
        actor_name=current_user.get('full_name'),
        note="Staff inspection started"
    )
    
    return {
        "success": True,
        "event_id": event.id,
        "status": WarrantyStatus.UNDER_INSPECTION.value
    }

@warranty_router.post("/warranty/{warranty_id}/inspect")
async def record_inspection_result(
    warranty_id: str,
    inspection: InspectionCreate,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    tenant_db = tenant_ctx.db
    tenant_id = tenant_ctx.user.get("tenant_id")
    current_user = tenant_ctx.user
    
    warranty = await tenant_db.warranty_records.find_one(
        {"id": warranty_id, "tenant_id": tenant_id},
        {"_id": 0}
    )
    
    if not warranty:
        raise HTTPException(status_code=404, detail="Warranty not found")
    
    if inspection.inspection_result.lower() == "valid":
        new_status = WarrantyStatus.REPLACEMENT_PENDING
        event_type = EventType.INSPECTION_PASSED
        
        await create_warranty_event(
            tenant_db,
            warranty_id,
            EventType.SUPPLIER_ACTION_REQUESTED,
            ActorType.STAFF,
            tenant_id,
            actor_id=current_user.get('id'),
            actor_name=current_user.get('full_name'),
            note="Supplier action requested for replacement",
            meta={
                "estimated_cost": inspection.estimated_cost,
                "supplier_id": warranty.get('supplier_id')
            }
        )
    else:
        new_status = WarrantyStatus.DECLINED
        event_type = EventType.INSPECTION_FAILED
    
    await update_warranty_status(
        tenant_db,
        warranty_id,
        new_status,
        tenant_id,
        ActorType.STAFF,
        actor_id=current_user.get('id'),
        note=inspection.notes
    )
    
    event = await create_warranty_event(
        tenant_db,
        warranty_id,
        event_type,
        ActorType.STAFF,
        tenant_id,
        actor_id=current_user.get('id'),
        actor_name=current_user.get('full_name'),
        note=inspection.notes,
        attachments=inspection.attachments,
        meta={
            "inspection_result": inspection.inspection_result,
            "estimated_cost": inspection.estimated_cost
        }
    )
    
    return {
        "success": True,
        "event_id": event.id,
        "status": new_status.value
    }

@warranty_router.post("/warranty/{warranty_id}/supplier-action")
async def record_supplier_action(
    warranty_id: str,
    action: SupplierActionCreate,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    tenant_db = tenant_ctx.db
    tenant_id = tenant_ctx.user.get("tenant_id")
    current_user = tenant_ctx.user
    
    warranty = await tenant_db.warranty_records.find_one(
        {"id": warranty_id, "tenant_id": tenant_id},
        {"_id": 0}
    )
    
    if not warranty:
        raise HTTPException(status_code=404, detail="Warranty not found")
    
    supplier_action = SupplierAction(
        tenant_id=tenant_id,
        warranty_id=warranty_id,
        supplier_id=warranty.get('supplier_id', ''),
        supplier_name=warranty.get('supplier_name'),
        action_type=action.action_type,
        action_details=action.action_details,
        status=SupplierActionStatus.CONFIRMED,
        notes=action.notes
    )
    
    action_dict = supplier_action.model_dump()
    action_dict['created_at'] = action_dict['created_at'].isoformat()
    action_dict['updated_at'] = action_dict['updated_at'].isoformat()
    
    await tenant_db.supplier_actions.insert_one(action_dict)
    
    if action.action_type == SupplierActionType.REPLACEMENT_SENT:
        new_status = WarrantyStatus.REPLACED
        
        replacement_serial = action.action_details.get('replacement_serial')
        if replacement_serial:
            new_warranty_id_temp = str(uuid.uuid4())
            
            new_warranty = WarrantyRecord(
                id=new_warranty_id_temp,
                tenant_id=tenant_id,
                warranty_code=f"{warranty['warranty_code']}-R",
                warranty_token=generate_warranty_token(new_warranty_id_temp, tenant_id),
                invoice_id=warranty['invoice_id'],
                invoice_no=warranty['invoice_no'],
                sale_id=warranty['sale_id'],
                product_id=warranty['product_id'],
                product_name=warranty['product_name'],
                serial_number=replacement_serial,
                customer_name=warranty.get('customer_name'),
                customer_phone=warranty.get('customer_phone'),
                customer_email=warranty.get('customer_email'),
                supplier_id=warranty.get('supplier_id'),
                supplier_name=warranty.get('supplier_name'),
                purchase_date=datetime.now(timezone.utc),
                warranty_period_months=warranty['warranty_period_months'],
                warranty_start_date=datetime.now(timezone.utc),
                warranty_expiry_date=datetime.now(timezone.utc) + timedelta(days=warranty['warranty_period_months'] * 30),
                current_status=WarrantyStatus.ACTIVE
            )
            
            new_warranty_dict = new_warranty.model_dump()
            new_warranty_dict['created_at'] = new_warranty_dict['created_at'].isoformat()
            new_warranty_dict['updated_at'] = new_warranty_dict['updated_at'].isoformat()
            new_warranty_dict['purchase_date'] = new_warranty_dict['purchase_date'].isoformat()
            new_warranty_dict['warranty_start_date'] = new_warranty_dict['warranty_start_date'].isoformat()
            new_warranty_dict['warranty_expiry_date'] = new_warranty_dict['warranty_expiry_date'].isoformat()
            
            await tenant_db.warranty_records.insert_one(new_warranty_dict)
            
            await tenant_db.warranty_records.update_one(
                {"id": warranty_id, "tenant_id": tenant_id},
                {"$set": {"replaced_by_warranty_id": new_warranty.id}}
            )
    
    elif action.action_type == SupplierActionType.CASH_REFUND_OFFERED:
        new_status = WarrantyStatus.REFUNDED
        
        transaction = FinancialTransaction(
            tenant_id=tenant_id,
            warranty_id=warranty_id,
            transaction_type="refund",
            amount=action.action_details.get('amount', 0),
            reference=action.action_details.get('reference'),
            notes=action.notes,
            approved_by=current_user.get('id'),
            approved_at=datetime.now(timezone.utc)
        )
        
        trans_dict = transaction.model_dump()
        trans_dict['created_at'] = trans_dict['created_at'].isoformat()
        trans_dict['updated_at'] = trans_dict['updated_at'].isoformat()
        if trans_dict.get('approved_at'):
            trans_dict['approved_at'] = trans_dict['approved_at'].isoformat()
        
        await tenant_db.financial_transactions.insert_one(trans_dict)
    
    elif action.action_type == SupplierActionType.DECLINED:
        new_status = WarrantyStatus.DECLINED
    else:
        new_status = WarrantyStatus.REPLACEMENT_PENDING
    
    await update_warranty_status(
        tenant_db,
        warranty_id,
        new_status,
        tenant_id,
        ActorType.SUPPLIER,
        note=action.notes or f"Supplier action: {action.action_type.value}"
    )
    
    await create_warranty_event(
        tenant_db,
        warranty_id,
        EventType.SUPPLIER_ACTION_RECORDED,
        ActorType.SUPPLIER,
        tenant_id,
        note=action.notes,
        meta={
            "action_type": action.action_type.value,
            "action_details": action.action_details
        }
    )
    
    return {
        "success": True,
        "supplier_action_id": supplier_action.id,
        "warranty_status": new_status.value
    }

@warranty_router.get("/warranty/list")
async def list_warranties(
    tenant_ctx: TenantContext = Depends(get_tenant_context),
    status: Optional[str] = None,
    customer_phone: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    tenant_db = tenant_ctx.db
    tenant_id = tenant_ctx.user.get("tenant_id")
    
    query = {"tenant_id": tenant_id}
    if status:
        query["current_status"] = status
    if customer_phone:
        query["customer_phone"] = customer_phone
    
    warranties = await tenant_db.warranty_records.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await tenant_db.warranty_records.count_documents(query)
    
    for w in warranties:
        if isinstance(w.get('created_at'), str):
            w['created_at'] = datetime.fromisoformat(w['created_at'])
        if isinstance(w.get('updated_at'), str):
            w['updated_at'] = datetime.fromisoformat(w['updated_at'])
        if isinstance(w.get('warranty_expiry_date'), str):
            w['warranty_expiry_date'] = datetime.fromisoformat(w['warranty_expiry_date'])
    
    return {
        "warranties": warranties,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@warranty_router.get("/warranty/{warranty_id}")
async def get_warranty_details(
    warranty_id: str,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    tenant_db = tenant_ctx.db
    tenant_id = tenant_ctx.user.get("tenant_id")
    
    warranty = await tenant_db.warranty_records.find_one(
        {"id": warranty_id, "tenant_id": tenant_id},
        {"_id": 0}
    )
    
    if not warranty:
        raise HTTPException(status_code=404, detail="Warranty not found")
    
    events = await tenant_db.warranty_events.find(
        {"warranty_id": warranty_id, "tenant_id": tenant_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    supplier_actions = await tenant_db.supplier_actions.find(
        {"warranty_id": warranty_id, "tenant_id": tenant_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "warranty": warranty,
        "events": events,
        "supplier_actions": supplier_actions
    }

@warranty_router.get("/warranty/stats/dashboard")
async def get_warranty_stats(
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    tenant_db = tenant_ctx.db
    tenant_id = tenant_ctx.user.get("tenant_id")
    
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": "$current_status",
            "count": {"$sum": 1}
        }}
    ]
    
    status_counts = await tenant_db.warranty_records.aggregate(pipeline).to_list(100)
    
    stats = {
        "total_warranties": 0,
        "active": 0,
        "claimed": 0,
        "under_inspection": 0,
        "replacement_pending": 0,
        "replaced": 0,
        "refunded": 0,
        "declined": 0,
        "closed": 0
    }
    
    for item in status_counts:
        status = item['_id']
        count = item['count']
        stats['total_warranties'] += count
        if status in stats:
            stats[status] = count
    
    recent_claims = await tenant_db.warranty_events.count_documents({
        "tenant_id": tenant_id,
        "event_type": "claim_registered",
        "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}
    })
    
    stats['new_claims_last_7_days'] = recent_claims
    
    return stats
