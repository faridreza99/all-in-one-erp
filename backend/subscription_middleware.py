"""
Subscription Guard Middleware
Checks if tenant has active subscription before allowing API access
"""
from fastapi import HTTPException, status
from subscription_state_manager import SubscriptionStateManager
from tenant_dependency import TenantContext
import logging

logger = logging.getLogger(__name__)

async def check_subscription_access(tenant_context: TenantContext):
    """
    Dependency that checks if a tenant has active subscription access.
    Raises 402 Payment Required if subscription is suspended or cancelled.
    
    Args:
        tenant_context: Current tenant context from request
        
    Raises:
        HTTPException: 402 if subscription is inactive
    """
    # Skip check for non-tenant requests (e.g., super admin, auth routes)
    if not tenant_context or not tenant_context.tenant_id:
        return
    
    tenant_id = tenant_context.tenant_id
    
    # Check if subscription is active
    has_access = await SubscriptionStateManager.is_subscription_active(tenant_id)
    
    if not has_access:
        # Get subscription details for error message
        subscription = await SubscriptionStateManager.get_subscription_status(tenant_id)
        
        if subscription:
            status_msg = subscription["status"].upper()
            plan_name = subscription.get("plan_snapshot", {}).get("name", "Unknown")
            
            # Check if in grace period
            if subscription["status"] == "grace":
                logger.warning(f"⚠️  Tenant {tenant_id} accessing in grace period")
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "message": "Your subscription has expired and is in grace period. Please renew to continue uninterrupted access.",
                        "status": status_msg,
                        "plan": plan_name,
                        "grace_expires_at": str(subscription.get("grace_expires_at"))
                    }
                )
            else:
                logger.warning(f"⚠️  Tenant {tenant_id} blocked - subscription {status_msg}")
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "message": f"Your subscription is {status_msg}. Please contact support or renew your subscription to regain access.",
                        "status": status_msg,
                        "plan": plan_name
                    }
                )
        else:
            # No subscription found (shouldn't happen but handle gracefully)
            logger.warning(f"⚠️  No subscription found for tenant {tenant_id}")
            # Allow access for backwards compatibility
            return
    
    # Subscription is active, allow access
    return

def skip_subscription_check():
    """
    Dependency that skips subscription check.
    Use for routes that should be accessible regardless of subscription status
    (e.g., billing pages, account settings)
    """
    return None
