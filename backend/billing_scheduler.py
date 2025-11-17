"""
Background scheduler for billing operations
Runs periodic tasks like subscription expiration checks
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from subscription_state_manager import SubscriptionStateManager
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)

# Create global scheduler instance
scheduler = AsyncIOScheduler()

async def check_subscription_expirations():
    """
    Periodic task to check and update expired subscriptions
    Runs every hour
    """
    logger.info("🔄 Running subscription expiration check...")
    
    try:
        actions = await SubscriptionStateManager.check_expired_subscriptions()
        logger.info(f"✅ Subscription check complete: {actions}")
    except Exception as e:
        logger.error(f"❌ Error checking subscriptions: {str(e)}")

async def send_daily_customer_due_reminders():
    """
    Send daily reminders for all customer dues
    Runs once daily at 9 AM
    """
    logger.info("🔄 Running daily customer due reminder check...")
    
    try:
        from db_connection import resolve_tenant_db, get_all_tenants
        from models import Notification, NotificationType
        
        # Get all active tenants
        tenants = await get_all_tenants()
        total_notifications = 0
        
        for tenant in tenants:
            try:
                # Skip suspended tenants
                if tenant.get('status') == 'suspended':
                    continue
                
                tenant_slug = tenant.get('tenant_slug')
                if not tenant_slug:
                    continue
                
                # Resolve tenant database
                target_db = await resolve_tenant_db(tenant_slug)
                
                # Get all customer dues
                customer_dues = await target_db.customer_dues.find(
                    {"tenant_id": tenant.get('tenant_id'), "due_amount": {"$gt": 0}},
                    {"_id": 0}
                ).to_list(1000)
                
                # Create notifications for each due
                twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
                
                for due in customer_dues:
                    # Check if notification was already sent today
                    recent_notif = await target_db.notifications.find_one({
                        "tenant_id": tenant.get('tenant_id'),
                        "type": NotificationType.UNPAID_INVOICE.value,
                        "reference_id": due['id'],
                        "created_at": {"$gte": twenty_four_hours_ago.isoformat()}
                    })
                    
                    if not recent_notif:
                        # Create daily reminder notification
                        notification = Notification(
                            tenant_id=tenant.get('tenant_id'),
                            type=NotificationType.UNPAID_INVOICE,
                            reference_id=due['id'],
                            sale_id=due.get('sale_id'),
                            message=f"Reminder: {due['customer_name']} has outstanding due of ৳{due['due_amount']:.2f} (Invoice: {due['sale_number']})",
                            is_sticky=False
                        )
                        notif_doc = notification.model_dump()
                        notif_doc['created_at'] = notif_doc['created_at'].isoformat()
                        notif_doc['updated_at'] = notif_doc['updated_at'].isoformat()
                        await target_db.notifications.insert_one(notif_doc)
                        total_notifications += 1
                
                logger.info(f"✅ Created {len(customer_dues)} due reminders for tenant {tenant_slug}")
            
            except Exception as tenant_error:
                logger.error(f"❌ Error processing dues for tenant {tenant.get('tenant_slug')}: {str(tenant_error)}")
                continue
        
        logger.info(f"✅ Daily due reminder check complete: {total_notifications} notifications created")
    
    except Exception as e:
        logger.error(f"❌ Error in daily customer due reminders: {str(e)}")

def start_scheduler():
    """Start the background scheduler"""
    # Schedule subscription checks every hour
    scheduler.add_job(
        check_subscription_expirations,
        CronTrigger(hour='*'),  # Every hour
        id='subscription_expiration_check',
        name='Check subscription expirations',
        replace_existing=True
    )
    
    # Schedule daily customer due reminders at 9 AM
    scheduler.add_job(
        send_daily_customer_due_reminders,
        CronTrigger(hour=9, minute=0),  # Daily at 9:00 AM
        id='daily_customer_due_reminders',
        name='Send daily customer due reminders',
        replace_existing=True
    )
    
    # Also check every 15 minutes for faster response (optional)
    # Uncomment for more frequent checks:
    # scheduler.add_job(
    #     check_subscription_expirations,
    #     CronTrigger(minute='*/15'),
    #     id='subscription_expiration_check_frequent',
    #     name='Check subscription expirations (frequent)',
    #     replace_existing=True
    # )
    
    scheduler.start()
    logger.info("✅ Billing scheduler started successfully")

def stop_scheduler():
    """Stop the background scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("🛑 Billing scheduler stopped")
