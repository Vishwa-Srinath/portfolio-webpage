import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_contact_notification(name: str, email: str, message: str) -> bool:
    """
    Send an email notification when someone submits the contact form.
    Using Resend as the default; can swap to SMTP if needed.

    Args:
        name: Name of the person who submitted the form.
        email: Email address of the submitter.
        message: The contact message content.

    Returns:
        True if email was sent successfully, False otherwise.
    """

    if not settings.resend_api_key:
        logger.warning("Resend API key not set, email notification skipped")
        return False

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                },
                json={
                    "from": settings.smtp_from_email,
                    "to": settings.contact_notification_email,
                    "subject": f"New contact from {name}",
                    "html": f"""
                    <h2>New Contact Form Submission</h2>
                    <p><strong>From:</strong> {name} ({email})</p>
                    <p><strong>Message:</strong></p>
                    <p>{message}</p>
                    """,
                },
                timeout=10.0,
            )

        if response.status_code == 200:
            logger.info(f"Contact email sent from {email}")
            return True
        else:
            logger.error(f"Resend error: {response.status_code}")
            return False

    except Exception as e:
        logger.error(f"Email service error: {e}")
        return False
