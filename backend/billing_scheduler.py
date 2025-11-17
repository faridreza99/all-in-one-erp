"""
Background scheduler for billing operations
Runs periodic tasks like subscription expiration checks
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from subscription_state_manager import SubscriptionStateManager
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
