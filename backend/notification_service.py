"""
Notification Service
Handles announcement creation, audience filtering, and delivery tracking
"""
from motor.motor_asyncio import AsyncIOMotorClient
from notification_models import (
    Announcement, NotificationReceipt, EmailCampaign, EmailQueue,
    AudienceType, NotificationChannel, AnnouncementType
)
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging
import os

logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
mongo_client = AsyncIOMotorClient(MONGO_URL)
admin_db = mongo_client["admin_hub"]

class NotificationService:
    """Service for managing announcements and notifications"""
    
    @staticmethod
    async def create_announcement(announcement_data: Announcement, created_by: str) -> Dict[str, Any]:
        """
        Create a new announcement and calculate recipients
        
        Args:
            announcement_data: Announcement details
            created_by: Super admin username
            
        Returns:
            Created announcement with recipient count
        """
        announcement = announcement_data.dict()
        announcement["created_by"] = created_by
        announcement["published_at"] = datetime.utcnow()
        
        # Calculate recipients based on audience type
        recipient_count = await NotificationService._calculate_recipients(announcement)
        announcement["total_recipients"] = recipient_count
        
        # Insert announcement
        await admin_db.announcements.insert_one(announcement)
        
        # If in-app notification, create receipts for all recipients
        if NotificationChannel.IN_APP in announcement["channels"] or NotificationChannel.BOTH in announcement["channels"]:
            await NotificationService._create_notification_receipts(announcement)
        
        # Remove MongoDB's _id field before returning (it's not JSON serializable)
        if "_id" in announcement:
            del announcement["_id"]
        
        logger.info(f"✅ Created announcement {announcement['announcement_id']} for {recipient_count} recipients")
        return announcement
    
    @staticmethod
    async def _calculate_recipients(announcement: Dict[str, Any]) -> int:
        """
        Calculate how many tenants will receive this announcement
        
        Args:
            announcement: Announcement data
            
        Returns:
            Number of recipients
        """
        audience_type = announcement["audience_type"]
        
        if audience_type == AudienceType.ALL_TENANTS.value:
            # Count all active tenants
            count = await admin_db.tenant_registry.count_documents({"status": "active"})
            return count
        
        elif audience_type == AudienceType.SPECIFIC_SECTORS.value:
            # Count tenants in specific sectors
            sectors = announcement.get("target_sectors", [])
            count = await admin_db.tenant_registry.count_documents({
                "business_type": {"$in": sectors},
                "status": "active"
            })
            return count
        
        elif audience_type == AudienceType.SPECIFIC_TENANTS.value:
            # Count specific tenant IDs
            tenant_ids = announcement.get("target_tenant_ids", [])
            count = await admin_db.tenant_registry.count_documents({
                "tenant_id": {"$in": tenant_ids},
                "status": "active"
            })
            return count
        
        elif audience_type == AudienceType.CUSTOM_FILTER.value:
            # Use custom MongoDB query
            custom_filter = announcement.get("custom_filter", {})
            custom_filter["status"] = "active"  # Always filter active tenants
            count = await admin_db.tenant_registry.count_documents(custom_filter)
            return count
        
        return 0
    
    @staticmethod
    async def _create_notification_receipts(announcement: Dict[str, Any]):
        """
        Create notification receipts for all recipients
        
        Args:
            announcement: Announcement data
        """
        # Get recipient tenant IDs
        tenant_ids = await NotificationService._get_recipient_tenant_ids(announcement)
        
        # Create receipts
        receipts = []
        for tenant_id in tenant_ids:
            receipt = NotificationReceipt(
                announcement_id=announcement["announcement_id"],
                tenant_id=tenant_id,
                channel=NotificationChannel.IN_APP
            )
            receipts.append(receipt.dict())
        
        if receipts:
            await admin_db.notification_receipts.insert_many(receipts)
            logger.info(f"Created {len(receipts)} notification receipts for {announcement['announcement_id']}")
    
    @staticmethod
    async def _get_recipient_tenant_ids(announcement: Dict[str, Any]) -> List[str]:
        """
        Get list of tenant IDs that should receive this announcement
        
        Args:
            announcement: Announcement data
            
        Returns:
            List of tenant IDs
        """
        audience_type = announcement["audience_type"]
        
        query = {"status": "active"}
        
        if audience_type == AudienceType.ALL_TENANTS.value:
            pass  # Query all active
        
        elif audience_type == AudienceType.SPECIFIC_SECTORS.value:
            sectors = announcement.get("target_sectors", [])
            if sectors:
                query["business_type"] = {"$in": sectors}  # type: ignore
        
        elif audience_type == AudienceType.SPECIFIC_TENANTS.value:
            tenant_ids = announcement.get("target_tenant_ids", [])
            if tenant_ids:
                query["tenant_id"] = {"$in": tenant_ids}  # type: ignore
        
        elif audience_type == AudienceType.CUSTOM_FILTER.value:
            custom_filter = announcement.get("custom_filter", {})
            query.update(custom_filter)
        
        # Fetch tenant IDs
        tenants = await admin_db.tenant_registry.find(query, {"tenant_id": 1}).to_list(None)
        return [t["tenant_id"] for t in tenants]
    
    @staticmethod
    async def get_announcements_for_tenant(tenant_id: str) -> List[Dict[str, Any]]:
        """
        Get all active announcements for a specific tenant
        
        Args:
            tenant_id: Tenant ID
            
        Returns:
            List of announcements with read status
        """
        # Get all receipts for this tenant
        receipts = await admin_db.notification_receipts.find({
            "tenant_id": tenant_id
        }).to_list(None)
        
        if not receipts:
            return []
        
        # Get announcement IDs
        announcement_ids = [r["announcement_id"] for r in receipts]
        
        # Fetch announcements
        now = datetime.utcnow()
        announcements = await admin_db.announcements.find({
            "announcement_id": {"$in": announcement_ids},
            "is_active": True,
            "$or": [
                {"expires_at": None},
                {"expires_at": {"$gt": now}}
            ]
        }).sort("priority", -1).sort("created_at", -1).to_list(None)
        
        # Merge read status
        receipt_map = {r["announcement_id"]: r for r in receipts}
        for ann in announcements:
            receipt = receipt_map.get(ann["announcement_id"])
            if receipt:
                ann["is_read"] = receipt.get("is_read", False)
                ann["read_at"] = receipt.get("read_at")
                ann["is_dismissed"] = receipt.get("is_dismissed", False)
        
        return announcements
    
    @staticmethod
    async def mark_as_read(announcement_id: str, tenant_id: str) -> bool:
        """
        Mark an announcement as read for a tenant
        
        Args:
            announcement_id: Announcement ID
            tenant_id: Tenant ID
            
        Returns:
            True if updated
        """
        result = await admin_db.notification_receipts.update_one(
            {
                "announcement_id": announcement_id,
                "tenant_id": tenant_id
            },
            {
                "$set": {
                    "is_read": True,
                    "read_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            # Increment total_read counter
            await admin_db.announcements.update_one(
                {"announcement_id": announcement_id},
                {"$inc": {"total_read": 1}}
            )
            return True
        
        return False
    
    @staticmethod
    async def mark_as_dismissed(announcement_id: str, tenant_id: str) -> bool:
        """
        Mark an announcement as dismissed for a tenant
        
        Args:
            announcement_id: Announcement ID
            tenant_id: Tenant ID
            
        Returns:
            True if updated
        """
        result = await admin_db.notification_receipts.update_one(
            {
                "announcement_id": announcement_id,
                "tenant_id": tenant_id
            },
            {
                "$set": {
                    "is_dismissed": True,
                    "dismissed_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            # Increment total_dismissed counter
            await admin_db.announcements.update_one(
                {"announcement_id": announcement_id},
                {"$inc": {"total_dismissed": 1}}
            )
            return True
        
        return False
    
    @staticmethod
    async def get_unread_count(tenant_id: str) -> int:
        """
        Get count of unread announcements for a tenant
        
        Args:
            tenant_id: Tenant ID
            
        Returns:
            Count of unread notifications
        """
        count = await admin_db.notification_receipts.count_documents({
            "tenant_id": tenant_id,
            "is_read": False,
            "is_dismissed": False
        })
        return count
    
    @staticmethod
    async def get_all_announcements(skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get all announcements (for super admin)
        
        Args:
            skip: Pagination offset
            limit: Page size
            
        Returns:
            List of announcements
        """
        announcements = await admin_db.announcements.find().sort("created_at", -1).skip(skip).limit(limit).to_list(None)
        return announcements
    
    @staticmethod
    async def delete_announcement(announcement_id: str) -> bool:
        """
        Delete an announcement (soft delete)
        
        Args:
            announcement_id: Announcement ID
            
        Returns:
            True if deleted
        """
        result = await admin_db.announcements.update_one(
            {"announcement_id": announcement_id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0
