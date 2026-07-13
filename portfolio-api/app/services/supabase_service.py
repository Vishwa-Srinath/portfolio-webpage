import logging
from typing import Optional

from supabase import create_client, Client

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Lazy-initialized Supabase client singleton
# This avoids import-time validation that blocks test mocking
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create the Supabase service-role client (singleton).

    Uses lazy initialization to allow test fixtures to mock
    this function before the real client is created.

    Returns:
        Supabase Client instance.
    """
    global _supabase_client
    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _supabase_client


async def insert_contact_message(
    name: str, email: str, message: str, ip_hash: str
) -> Optional[str]:
    """
    Insert a contact form submission into the database.

    Args:
        name: Visitor's name (1-100 characters).
        email: Visitor's email address.
        message: Contact message (10-3000 characters).
        ip_hash: SHA256 hash of visitor's IP address.

    Returns:
        UUID of inserted row, or None if insertion failed.
    """
    try:
        client = get_supabase_client()
        response = (
            client.table("messages")
            .insert(
                {
                    "name": name,
                    "email": email,
                    "message": message,
                    "ip_hash": ip_hash,
                    "is_read": False,
                }
            )
            .execute()
        )

        if response.data:
            logger.info(f"Contact message stored: {response.data[0]['id']}")
            return response.data[0]["id"]
        else:
            logger.error(f"Insert failed: {response}")
            return None

    except Exception as e:
        logger.error(f"Database insert error: {e}")
        return None


async def insert_event(
    event_name: str,
    page: str,
    metadata: Optional[dict] = None,
    session_id: Optional[str] = None,
    referrer: Optional[str] = None,
) -> Optional[str]:
    """
    Insert an analytics event.

    Args:
        event_name: Name of the event (e.g., "resume_download").
        page: Page URL or identifier where the event occurred.
        metadata: Optional event-specific data as a dict.
        session_id: Optional client-generated UUID for session correlation.
        referrer: Optional referrer URL.

    Returns:
        UUID of inserted event, or None if insertion failed.
    """
    try:
        client = get_supabase_client()
        response = (
            client.table("events")
            .insert(
                {
                    "event_name": event_name,
                    "page": page,
                    "metadata": metadata or {},
                    "session_id": session_id,
                    "referrer": referrer,
                }
            )
            .execute()
        )

        if response.data:
            logger.info(f"Event logged: {event_name} on {page}")
            return response.data[0]["id"]
        else:
            logger.error(f"Event insert failed: {response}")
            return None

    except Exception as e:
        logger.error(f"Event insert error: {e}")
        return None


async def check_db_health() -> bool:
    """
    Quick query to verify DB connectivity.

    Returns:
        True if database is reachable, False otherwise.
    """
    try:
        client = get_supabase_client()
        client.table("messages").select("id").limit(1).execute()
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
