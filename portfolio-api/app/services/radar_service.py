import logging
from typing import Optional, List, Dict, Any
from app.services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)


async def get_radar_entries(
    status: Optional[str] = None,
    category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch Tech Radar entries, ordered by entry_date descending.

    Args:
        status:   Optional status filter ('watching', 'trying', 'adopted', 'dropped').
        category: Optional category filter (free text, e.g. 'framework', 'infra').

    Returns:
        List of radar entry dictionaries.
    """
    try:
        client = get_supabase_client()
        query = client.table("tech_radar_entries").select("*")
        if status:
            query = query.eq("status", status)
        if category:
            query = query.eq("category", category)
        response = query.order("entry_date", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching Tech Radar entries: {e}")
        return []
