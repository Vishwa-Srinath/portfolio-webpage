import logging

from fastapi import APIRouter, Request, Depends

from app.models.schemas import ContactRequest, ContactResponse
from app.core.config import get_settings
from app.services.email_service import send_contact_notification
from app.services.supabase_service import insert_contact_message
from app.deps import rate_limit_by_ip, hash_ip
from app.exceptions import AppException

router = APIRouter(tags=["contact"])
logger = logging.getLogger(__name__)
settings = get_settings()


@router.post("/contact", response_model=ContactResponse)
async def submit_contact(
    request: ContactRequest,
    req: Request,
    rate_limited: bool = Depends(rate_limit_by_ip),
):
    """
    Submit a contact form.
    Validates input, checks rate limit, stores in DB, sends notification email.
    """

    # Honeypot validation (already done by Pydantic, but explicit is clear)
    if request.honeypot:
        client_ip = req.client.host if req.client else "unknown"
        logger.warning(f"Honeypot triggered from {client_ip}")
        # Don't reveal honeypot was used; silently return success (confuses bots)
        return ContactResponse(success=True, id="noop", message="Message sent!")

    # Rate limit (dependency validates this)
    if not rate_limited:
        raise AppException(status_code=429, detail="Too many requests")

    # Store in database
    ip_hash = hash_ip(req.client.host if req.client else "unknown")
    message_id = await insert_contact_message(
        name=request.name,
        email=request.email,
        message=request.message,
        ip_hash=ip_hash,
    )

    if not message_id:
        raise AppException(status_code=500, detail="Failed to store message")

    # Send notification email
    email_sent = await send_contact_notification(
        name=request.name,
        email=request.email,
        message=request.message,
    )

    if not email_sent:
        logger.warning(f"Email notification failed for contact {message_id}")
        # Still return success — message was stored, email is a bonus

    return ContactResponse(success=True, id=message_id)
