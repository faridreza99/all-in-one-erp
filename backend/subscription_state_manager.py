"""
Subscription State Machine Manager
Handles all state transitions for billing subscriptions
"""
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from billing_models import SubscriptionStatus
from audit_logger import log_action
import os

mongo_url = os.environ.get('MONGO_URL') or os.environ.get('Mongo_URL')

class SubscriptionStateManager:
    """Manages subscription lifecycle state transitions"""
    
    VALID_TRANSITIONS = {
        SubscriptionStatus.TRIAL: [SubscriptionStatus.ACTIVE, SubscriptionStatus.SUSPENDED, SubscriptionStatus.CANCELLED],
        SubscriptionStatus.ACTIVE: [SubscriptionStatus.GRACE, SubscriptionStatus.SUSPENDED, SubscriptionStatus.CANCELLED],
        SubscriptionStatus.GRACE: [SubscriptionStatus.ACTIVE, SubscriptionStatus.SUSPENDED],
        SubscriptionStatus.SUSPENDED: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED],
        SubscriptionStatus.CANCELLED: []
    }
    
    @staticmethod
    async def transition_state(subscription_id: str, new_status: SubscriptionStatus, reason: str, triggered_by: str):
        """
        Transition a subscription to a new state
        
        Args:
            subscription_id: Subscription ID
            new_status: Target status
            reason: Reason for transition
            triggered_by: User email or system identifier
            
        Returns:
            dict: Updated subscription or None if invalid transition
        """
        admin_client = AsyncIOMotorClient(mongo_url)
        admin_db = admin_client["admin_hub"]
        
        try:
            # Get current subscription
            subscription = await admin_db.subscriptions.find_one({"subscription_id": subscription_id})
            if not subscription:
                return None
            
            current_status = SubscriptionStatus(subscription["status"])
            
            # Validate transition
            if new_status not in SubscriptionStateManager.VALID_TRANSITIONS.get(current_status, []):
                raise ValueError(f"Invalid transition from {current_status.value} to {new_status.value}")
            
            now = datetime.now(timezone.utc)
            
            # Update subscription status
            update_data = {
                "status": new_status.value,
                "updated_at": now
            }
            
            await admin_db.subscriptions.update_one(
                {"subscription_id": subscription_id},
                {"$set": update_data}
            )
            
            # Create billing event
            event_doc = {
                "event_id": f"evt_{subscription_id}_{int(now.timestamp())}",
                "subscription_id": subscription_id,
                "tenant_id": subscription["tenant_id"],
                "event_type": "status_changed",
                "old_status": current_status.value,
                "new_status": new_status.value,
                "triggered_by": triggered_by,
                "reason": reason,
                "metadata": {},
                "created_at": now
            }
            await admin_db.billing_events.insert_one(event_doc)
            
            # Get updated subscription
            updated_sub = await admin_db.subscriptions.find_one(
                {"subscription_id": subscription_id},
                {"_id": 0}
            )
            
            return updated_sub
            
        finally:
            admin_client.close()
    
    @staticmethod
    async def check_expired_subscriptions():
        """
        Check all subscriptions for expiration and apply state transitions
        Called by background scheduler
        
        Returns:
            dict: Summary of actions taken
        """
        admin_client = AsyncIOMotorClient(mongo_url)
        admin_db = admin_client["admin_hub"]
        
        now = datetime.now(timezone.utc)
        actions_taken = {
            "trial_expired": 0,
            "moved_to_grace": 0,
            "suspended": 0,
            "already_suspended": 0
        }
        
        try:
            # Find all active or trial subscriptions
            subscriptions = await admin_db.subscriptions.find({
                "status": {"$in": [SubscriptionStatus.TRIAL.value, SubscriptionStatus.ACTIVE.value, SubscriptionStatus.GRACE.value]}
            }).to_list(1000)
            
            for sub in subscriptions:
                sub_id = sub["subscription_id"]
                status = sub["status"]
                
                # Check trial expiration
                if status == SubscriptionStatus.TRIAL.value and sub.get("trial_ends_at"):
                    if now > sub["trial_ends_at"]:
                        # Trial expired - move to suspended (no payment)
                        await SubscriptionStateManager.transition_state(
                            sub_id,
                            SubscriptionStatus.SUSPENDED,
                            "Trial period expired",
                            "system_scheduler"
                        )
                        actions_taken["trial_expired"] += 1
                
                # Check active subscription expiration
                elif status == SubscriptionStatus.ACTIVE.value and sub.get("expires_on"):
                    if now > sub["expires_on"]:
                        # Active expired - move to grace period
                        grace_days = sub.get("grace_period_days", 3)
                        grace_expires_at = now + timedelta(days=grace_days)
                        
                        # Use state machine for transition
                        await SubscriptionStateManager.transition_state(
                            sub_id,
                            SubscriptionStatus.GRACE,
                            f"Subscription expired, entering {grace_days}-day grace period",
                            "system_scheduler"
                        )
                        
                        # Update grace expiration metadata
                        await admin_db.subscriptions.update_one(
                            {"subscription_id": sub_id},
                            {"$set": {
                                "grace_expires_at": grace_expires_at,
                                "updated_at": now
                            }}
                        )
                        actions_taken["moved_to_grace"] += 1
                
                # Check grace period expiration
                elif status == SubscriptionStatus.GRACE.value and sub.get("grace_expires_at"):
                    if now > sub["grace_expires_at"]:
                        # Grace expired - suspend
                        await SubscriptionStateManager.transition_state(
                            sub_id,
                            SubscriptionStatus.SUSPENDED,
                            "Grace period expired without payment",
                            "system_scheduler"
                        )
                        actions_taken["suspended"] += 1
            
            return actions_taken
            
        finally:
            admin_client.close()
    
    @staticmethod
    async def get_subscription_status(tenant_id: str):
        """
        Get current subscription status for a tenant
        
        Args:
            tenant_id: Tenant ID
            
        Returns:
            dict: Subscription info or None
        """
        admin_client = AsyncIOMotorClient(mongo_url)
        admin_db = admin_client["admin_hub"]
        
        try:
            subscription = await admin_db.subscriptions.find_one(
                {"tenant_id": tenant_id},
                {"_id": 0}
            )
            return subscription
        finally:
            admin_client.close()
    
    @staticmethod
    async def is_subscription_active(tenant_id: str) -> bool:
        """
        Check if tenant's subscription is active (allows access)
        
        Args:
            tenant_id: Tenant ID
            
        Returns:
            bool: True if subscription is active, trial, or grace
        """
        subscription = await SubscriptionStateManager.get_subscription_status(tenant_id)
        
        if not subscription:
            # No subscription - allow access (backwards compatibility)
            return True
        
        # Allow access for active, trial, and grace statuses
        allowed_statuses = [
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIAL.value,
            SubscriptionStatus.GRACE.value
        ]
        
        return subscription["status"] in allowed_statuses
