"""
Notification System Database Models
Announcements, Email Campaigns, Notification Tracking
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ============================================================
# ENUMS
# ============================================================

class AnnouncementType(str, Enum):
    """Types of announcements"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    MAINTENANCE = "maintenance"
    FEATURE = "feature"
    PROMOTION = "promotion"

class AudienceType(str, Enum):
    """Target audience types"""
    ALL_TENANTS = "all_tenants"
    SPECIFIC_SECTORS = "specific_sectors"
    SPECIFIC_TENANTS = "specific_tenants"
    CUSTOM_FILTER = "custom_filter"

class NotificationChannel(str, Enum):
    """Delivery channels"""
    IN_APP = "in_app"
    EMAIL = "email"
    BOTH = "both"

class EmailCampaignStatus(str, Enum):
    """Email campaign states"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    CANCELLED = "cancelled"
    FAILED = "failed"

class EmailQueueStatus(str, Enum):
    """Individual email delivery status"""
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"
    COMPLAINED = "complained"

# ============================================================
# ANNOUNCEMENT MODELS
# ============================================================

class Announcement(BaseModel):
    """System-wide announcements for tenants"""
    announcement_id: str = Field(default_factory=lambda: f"ann_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)
    announcement_type: AnnouncementType = AnnouncementType.INFO
    
    # Audience targeting
    audience_type: AudienceType = AudienceType.ALL_TENANTS
    target_sectors: Optional[List[str]] = None  # e.g., ["pharmacy", "mobile_shop"]
    target_tenant_ids: Optional[List[str]] = None  # Specific tenant IDs
    custom_filter: Optional[Dict[str, Any]] = None  # MongoDB query for advanced filtering
    
    # Delivery settings
    channels: List[NotificationChannel] = [NotificationChannel.IN_APP]
    priority: int = Field(default=0, ge=0, le=10)  # 0=low, 10=critical
    
    # Scheduling
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None  # Auto-hide after this date
    
    # Metadata
    created_by: str  # Super admin username
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    # Stats
    total_recipients: int = 0  # Calculated when published
    total_read: int = 0
    total_dismissed: int = 0
    
    @validator('target_sectors')
    def validate_sectors(cls, v, values):
        """Ensure sectors are provided when audience_type is SPECIFIC_SECTORS"""
        if values.get('audience_type') == AudienceType.SPECIFIC_SECTORS and not v:
            raise ValueError("target_sectors required for SPECIFIC_SECTORS audience")
        return v
    
    @validator('target_tenant_ids')
    def validate_tenant_ids(cls, v, values):
        """Ensure tenant IDs are provided when audience_type is SPECIFIC_TENANTS"""
        if values.get('audience_type') == AudienceType.SPECIFIC_TENANTS and not v:
            raise ValueError("target_tenant_ids required for SPECIFIC_TENANTS audience")
        return v

class NotificationReceipt(BaseModel):
    """Tracks which tenants received/read announcements"""
    receipt_id: str = Field(default_factory=lambda: f"rcpt_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
    announcement_id: str
    tenant_id: str
    
    # Delivery tracking
    delivered_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None
    
    # Metadata
    channel: NotificationChannel
    is_read: bool = False
    is_dismissed: bool = False

# ============================================================
# EMAIL CAMPAIGN MODELS
# ============================================================

class EmailCampaign(BaseModel):
    """Email blast campaigns to tenants"""
    campaign_id: str = Field(default_factory=lambda: f"camp_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
    campaign_name: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1, max_length=500)
    
    # Email content
    body_html: str  # HTML template
    body_text: Optional[str] = None  # Plain text fallback
    
    # Personalization
    template_vars: Optional[Dict[str, Any]] = None  # Variables for Jinja2 templating
    
    # Audience (same as announcements)
    audience_type: AudienceType = AudienceType.ALL_TENANTS
    target_sectors: Optional[List[str]] = None
    target_tenant_ids: Optional[List[str]] = None
    custom_filter: Optional[Dict[str, Any]] = None
    
    # Scheduling
    status: EmailCampaignStatus = EmailCampaignStatus.DRAFT
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    
    # Stats
    total_recipients: int = 0
    total_sent: int = 0
    total_delivered: int = 0
    total_failed: int = 0
    total_bounced: int = 0
    total_complained: int = 0
    
    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Rate limiting
    send_rate_limit: int = Field(default=100, ge=1, le=1000)  # Emails per hour

class EmailQueue(BaseModel):
    """Individual emails in the queue"""
    queue_id: str = Field(default_factory=lambda: f"eq_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
    campaign_id: str
    tenant_id: str
    
    # Recipient info
    to_email: str
    to_name: Optional[str] = None
    
    # Email content (personalized)
    subject: str
    body_html: str
    body_text: Optional[str] = None
    
    # Delivery tracking
    status: EmailQueueStatus = EmailQueueStatus.PENDING
    scheduled_for: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    
    # Error tracking
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================================
# API REQUEST/RESPONSE MODELS
# ============================================================

class CreateAnnouncementRequest(BaseModel):
    """Request to create announcement"""
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)
    announcement_type: AnnouncementType = AnnouncementType.INFO
    audience_type: AudienceType = AudienceType.ALL_TENANTS
    target_sectors: Optional[List[str]] = None
    target_tenant_ids: Optional[List[str]] = None
    channels: List[NotificationChannel] = [NotificationChannel.IN_APP]
    priority: int = Field(default=0, ge=0, le=10)
    expires_at: Optional[datetime] = None

class CreateEmailCampaignRequest(BaseModel):
    """Request to create email campaign"""
    campaign_name: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1, max_length=500)
    body_html: str
    body_text: Optional[str] = None
    audience_type: AudienceType = AudienceType.ALL_TENANTS
    target_sectors: Optional[List[str]] = None
    target_tenant_ids: Optional[List[str]] = None
    scheduled_at: Optional[datetime] = None
    send_rate_limit: int = Field(default=100, ge=1, le=1000)
