from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional


# Contact form
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
        if v:  # If honeypot is filled, reject
            raise ValueError("Bot detected")
        return v


class ContactResponse(BaseModel):
    """Response schema for POST /api/v1/contact"""

    success: bool
    id: str
    message: Optional[str] = None


# Health check
class HealthCheckResponse(BaseModel):
    """Response schema for GET /api/v1/health"""

    status: str
    version: str
    database: str  # "ok" or "error"


# Analytics event (optional, v1.5+)
class EventRequest(BaseModel):
    """Request schema for POST /api/v1/events"""

    event_name: str = Field(min_length=1, max_length=100)
    page: str
    metadata: Optional[dict] = None


class EventResponse(BaseModel):
    """Response schema for POST /api/v1/events"""

    success: bool
    id: str
