"""
Email Service
Handles email sending via SMTP or SendGrid for email campaigns
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import Dict, Any, Optional, List
import logging
import os
import asyncio

logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
mongo_client = AsyncIOMotorClient(MONGO_URL)
admin_db = mongo_client["admin_hub"]

class EmailService:
    """Service for sending emails via SMTP or SendGrid"""
    
    @staticmethod
    async def send_smtp_email(
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        smtp_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send an email via SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (fallback)
            smtp_config: SMTP configuration (host, port, username, password)
            
        Returns:
            Dict with status and details
        """
        try:
            # Use default SMTP config if not provided
            if not smtp_config:
                smtp_config = await EmailService._get_default_smtp_config()
            
            # Create message
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = smtp_config.get('from_email', smtp_config.get('username'))
            message['To'] = to_email
            
            # Add plain text part
            if text_body:
                text_part = MIMEText(text_body, 'plain')
                message.attach(text_part)
            
            # Add HTML part
            html_part = MIMEText(html_body, 'html')
            message.attach(html_part)
            
            # Send via SMTP
            await aiosmtplib.send(
                message,
                hostname=smtp_config['host'],
                port=smtp_config.get('port', 587),
                username=smtp_config.get('username'),
                password=smtp_config.get('password'),
                use_tls=smtp_config.get('use_tls', True),
                timeout=30
            )
            
            logger.info(f"✅ Email sent to {to_email}: {subject}")
            return {
                "status": "sent",
                "to_email": to_email,
                "sent_at": datetime.utcnow(),
                "message": "Email sent successfully"
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {str(e)}")
            return {
                "status": "failed",
                "to_email": to_email,
                "error": str(e),
                "failed_at": datetime.utcnow()
            }
    
    @staticmethod
    async def send_campaign_email(
        campaign_id: str,
        tenant_id: str,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        personalization: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send a single email as part of a campaign with tracking
        
        Args:
            campaign_id: Campaign identifier
            tenant_id: Tenant identifier
            to_email: Recipient email
            subject: Email subject
            html_body: HTML body (can contain placeholders)
            text_body: Plain text body
            personalization: Dictionary of placeholder values
            
        Returns:
            Email queue record with status
        """
        # Personalize content if needed
        if personalization:
            for key, value in personalization.items():
                placeholder = f"{{{{{key}}}}}"
                html_body = html_body.replace(placeholder, str(value))
                if text_body:
                    text_body = text_body.replace(placeholder, str(value))
                subject = subject.replace(placeholder, str(value))
        
        # Create email queue record
        queue_record = {
            "queue_id": f"eq_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{to_email.replace('@', '_').replace('.', '_')}",
            "campaign_id": campaign_id,
            "tenant_id": tenant_id,
            "to_email": to_email,
            "subject": subject,
            "html_body": html_body,
            "text_body": text_body,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "attempts": 0
        }
        
        # Insert into queue
        await admin_db.email_queue.insert_one(queue_record)
        
        # Try to send immediately
        result = await EmailService.send_smtp_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )
        
        # Update queue record with result
        update_data = {
            "status": result["status"],
            "attempts": 1,
            "updated_at": datetime.utcnow()
        }
        
        if result["status"] == "sent":
            update_data["sent_at"] = result["sent_at"]
        else:
            update_data["error_message"] = result.get("error", "Unknown error")
            update_data["failed_at"] = result["failed_at"]
        
        await admin_db.email_queue.update_one(
            {"queue_id": queue_record["queue_id"]},
            {"$set": update_data}
        )
        
        return {**queue_record, **update_data}
    
    @staticmethod
    async def send_campaign_batch(
        campaign_id: str,
        recipients: List[Dict[str, Any]],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        rate_limit: int = 100
    ) -> Dict[str, Any]:
        """
        Send email campaign to multiple recipients with rate limiting
        
        Args:
            campaign_id: Campaign identifier
            recipients: List of recipient dicts with email, tenant_id, personalization
            subject: Email subject
            html_body: HTML template
            text_body: Plain text template
            rate_limit: Max emails per hour
            
        Returns:
            Campaign statistics
        """
        total = len(recipients)
        sent = 0
        failed = 0
        
        # Calculate delay between emails based on rate limit
        delay_seconds = 3600 / rate_limit if rate_limit > 0 else 0
        
        logger.info(f"📧 Starting campaign {campaign_id}: {total} recipients, {rate_limit}/hr rate limit")
        
        for recipient in recipients:
            try:
                result = await EmailService.send_campaign_email(
                    campaign_id=campaign_id,
                    tenant_id=recipient.get("tenant_id"),
                    to_email=recipient["email"],
                    subject=subject,
                    html_body=html_body,
                    text_body=text_body,
                    personalization=recipient.get("personalization", {})
                )
                
                if result["status"] == "sent":
                    sent += 1
                else:
                    failed += 1
                
                # Rate limiting delay
                if delay_seconds > 0:
                    await asyncio.sleep(delay_seconds)
                    
            except Exception as e:
                logger.error(f"Error sending to {recipient['email']}: {str(e)}")
                failed += 1
        
        # Update campaign statistics
        await admin_db.email_campaigns.update_one(
            {"campaign_id": campaign_id},
            {
                "$set": {
                    "status": "sent",
                    "total_sent": sent,
                    "total_failed": failed,
                    "sent_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"✅ Campaign {campaign_id} complete: {sent} sent, {failed} failed")
        
        return {
            "campaign_id": campaign_id,
            "total": total,
            "sent": sent,
            "failed": failed
        }
    
    @staticmethod
    async def _get_default_smtp_config() -> Dict[str, Any]:
        """
        Get default SMTP configuration from environment or database
        
        Returns:
            SMTP configuration dict
        """
        # Try to get from environment first
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = os.getenv("SMTP_PORT", "587")
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_username)
        
        if smtp_host and smtp_username and smtp_password:
            return {
                "host": smtp_host,
                "port": int(smtp_port),
                "username": smtp_username,
                "password": smtp_password,
                "from_email": smtp_from,
                "use_tls": True
            }
        
        # Try to get from database
        config = await admin_db.system_config.find_one({"config_type": "smtp"})
        if config:
            return config.get("smtp_config", {})
        
        # Return dummy config for development (will fail but show error)
        logger.warning("⚠️ No SMTP configuration found. Set SMTP environment variables.")
        return {
            "host": "smtp.gmail.com",
            "port": 587,
            "username": "your-email@gmail.com",
            "password": "your-app-password",
            "from_email": "your-email@gmail.com",
            "use_tls": True
        }
    
    @staticmethod
    async def get_campaign_stats(campaign_id: str) -> Dict[str, Any]:
        """
        Get statistics for an email campaign
        
        Args:
            campaign_id: Campaign identifier
            
        Returns:
            Campaign statistics
        """
        campaign = await admin_db.email_campaigns.find_one(
            {"campaign_id": campaign_id},
            {"_id": 0}
        )
        
        if not campaign:
            return None
        
        # Get queue statistics
        queue_stats = await admin_db.email_queue.aggregate([
            {"$match": {"campaign_id": campaign_id}},
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]).to_list(None)
        
        stats = {status["_id"]: status["count"] for status in queue_stats}
        
        return {
            "campaign": campaign,
            "queue_stats": stats,
            "total_queued": sum(stats.values()),
            "sent": stats.get("sent", 0),
            "failed": stats.get("failed", 0),
            "pending": stats.get("pending", 0)
        }
