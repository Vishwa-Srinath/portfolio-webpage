from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date


# ─────────────────────────────────────────────────────────────────────────────
# Contact form
# ─────────────────────────────────────────────────────────────────────────────
class ContactRequest(BaseModel):
    """Request schema for POST /api/v1/contact"""

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    message: str = Field(min_length=10, max_length=3000)
    honeypot: Optional[str] = None  # Should always be empty (bot trap)

    @field_validator("honeypot")
    @classmethod
    def check_honeypot(cls, v: Optional[str]) -> Optional[str]:
        """Reject if honeypot field is filled (bot detection)."""
        if v:
            raise ValueError("Bot detected")
        return v


class ContactResponse(BaseModel):
    """Response schema for POST /api/v1/contact"""

    success: bool
    id: str
    message: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────
class HealthCheckResponse(BaseModel):
    """Response schema for GET /api/v1/health"""

    status: str
    version: str
    database: str  # "ok" or "error"


# ─────────────────────────────────────────────────────────────────────────────
# Analytics events
# ─────────────────────────────────────────────────────────────────────────────
class EventRequest(BaseModel):
    """Request schema for POST /api/v1/events"""

    event_name: str = Field(min_length=1, max_length=100)
    page: str
    metadata: Optional[dict] = None
    session_id: Optional[str] = None   # Client-generated UUID, no PII
    referrer: Optional[str] = None


class EventResponse(BaseModel):
    """Response schema for POST /api/v1/events"""

    success: bool
    id: str


# ─────────────────────────────────────────────────────────────────────────────
# Profile (Site Owner Singleton)
# ─────────────────────────────────────────────────────────────────────────────
class ProfileResponse(BaseModel):
    """Response schema for GET /api/v1/profile"""

    id: str
    full_name: str
    role_line: str
    bio_short: str
    bio_long: str
    headshot_url: Optional[str] = None
    resume_url: Optional[str] = None
    location: Optional[str] = None
    email_public: Optional[str] = None
    education: List[Dict[str, Any]] = []
    skills: Dict[str, List[str]] = {}
    timeline: List[Dict[str, Any]] = []
    updated_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# External Links
# ─────────────────────────────────────────────────────────────────────────────
class ExternalLinkResponse(BaseModel):
    """Response schema for GET /api/v1/links"""

    id: str
    category: str
    platform: str
    label: str
    url: str
    icon: Optional[str] = None
    description: Optional[str] = None
    display_order: int
    is_active: bool
    metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Tags
# ─────────────────────────────────────────────────────────────────────────────
class TagResponse(BaseModel):
    """Response schema for tags"""

    id: str
    name: str
    slug: str
    color: Optional[str] = None
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Content Series
# ─────────────────────────────────────────────────────────────────────────────
class ContentSeriesResponse(BaseModel):
    """Response schema for content series"""

    id: str
    lane: str
    title: str
    description: Optional[str] = None
    slug: Optional[str] = None          # Future: series landing page slug
    display_order: int = 0
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Content Media
# ─────────────────────────────────────────────────────────────────────────────
class ContentMediaResponse(BaseModel):
    """Response schema for content media attachments"""

    id: str
    content_id: str
    media_type: str                     # "image" | "video" | "youtube" | "gif"
    url: str
    caption: Optional[str] = None
    alt_text: Optional[str] = None      # Accessibility: alt text for screen readers
    display_order: int
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Content Items
# ─────────────────────────────────────────────────────────────────────────────
class ContentItemResponse(BaseModel):
    """Response schema for GET /api/v1/content"""

    id: str
    lane: str
    slug: str
    title: str
    summary: str
    content_body: str
    cover_image_url: Optional[str] = None
    live_url: Optional[str] = None      # Projects only
    repo_url: Optional[str] = None      # Projects only
    video_url: Optional[str] = None     # Embedded YouTube demo
    status: str
    featured: bool
    series_id: Optional[str] = None
    series_order: Optional[int] = None  # Position within series (1-based)
    view_count: int
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    tags: List[TagResponse] = []
    media: List[ContentMediaResponse] = []


# ─────────────────────────────────────────────────────────────────────────────
# Tech Radar Entries
# ─────────────────────────────────────────────────────────────────────────────
class TechRadarEntryResponse(BaseModel):
    """Response schema for GET /api/v1/radar"""

    id: str
    entry_date: date
    title: str
    category: str                       # Free text — not an enum
    status: str                         # "watching" | "trying" | "adopted" | "dropped"
    summary: str
    link: Optional[str] = None
    tags: List[str] = []                # Optional radar-specific labels (text[], not FK)
    created_at: datetime
    updated_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# YouTube Video Cache
# ─────────────────────────────────────────────────────────────────────────────
class YouTubeVideoResponse(BaseModel):
    """Response schema for GET /api/v1/youtube"""

    id: str
    video_id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    channel_id: Optional[str] = None
    playlist_id: Optional[str] = None
    published_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    comment_count: Optional[int] = None
    tags: List[str] = []
    is_featured: bool
    is_visible: bool = True
    last_synced_at: datetime
    created_at: datetime
