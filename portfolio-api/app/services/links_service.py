import logging
from typing import Optional, List, Dict, Any
from app.services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)


async def get_active_links(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch active outbound links, ordered by display_order.

    Args:
        category: Optional category filter (e.g. 'social', 'google').

    Returns:
        List of link dictionaries.
    """
    try:
        client = get_supabase_client()
        query = client.table("external_links").select("*").eq("is_active", True)
        if category:
            query = query.eq("category", category)
        response = query.order("display_order", desc=False).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching external links: {e}")
        return []
