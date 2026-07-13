import logging
from typing import Optional, Dict, Any
from app.services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)


async def get_profile() -> Optional[Dict[str, Any]]:
    """
    Fetch the singleton profile row from the database.

    Returns:
        The profile dictionary, or None if not found or on error.
    """
    try:
        client = get_supabase_client()
        response = client.table("profile").select("*").limit(1).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return None
