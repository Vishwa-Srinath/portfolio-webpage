import logging
from typing import Optional, List, Dict, Any
from app.services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)


def map_content_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format the raw database row from content_items to match ContentItemResponse schema.
    Converts nested content_tags to flat tags list and normalizes content_media to media.
    """
    # Extract tags from the content_tags join (nested select returns list of dicts)
    tags = []
    for ct in row.get("content_tags", []):
        if isinstance(ct, dict) and "tags" in ct and ct["tags"]:
            tags.append(ct["tags"])
    row["tags"] = tags

    # Rename content_media → media (schema field name)
    row["media"] = row.get("content_media", []) or []

    return row


async def get_content_items(lane: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all published content items, optionally filtered by lane.

    Args:
        lane: Optional lane filter ('projects', 'learn', 'stories', 'notes').

    Returns:
        List of content item dictionaries with tags and media populated.
    """
    try:
        client = get_supabase_client()
        query = (
            client.table("content_items")
            .select("*, content_tags(tags:tag_id(*)), content_media(*)")
            .eq("status", "published")
        )
        if lane:
            query = query.eq("lane", lane)
        response = query.order("published_at", desc=True).execute()
        return [map_content_row(row) for row in response.data] if response.data else []
    except Exception as e:
        logger.error(f"Error fetching content items: {e}")
        return []


async def get_content_item_by_slug(lane: str, slug: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a single published content item by lane and slug.

    Args:
        lane: The content lane ('projects', 'learn', 'stories', 'notes').
        slug: The unique content slug (unique within the lane).

    Returns:
        Content item dictionary with tags and media populated, or None if not found.
    """
    try:
        client = get_supabase_client()
        response = (
            client.table("content_items")
            .select("*, content_tags(tags:tag_id(*)), content_media(*)")
            .eq("lane", lane)
            .eq("slug", slug)
            .eq("status", "published")
            .limit(1)
            .execute()
        )
        if response.data:
            return map_content_row(response.data[0])
        return None
    except Exception as e:
        logger.error(f"Error fetching content item by slug ({lane}/{slug}): {e}")
        return None


async def search_content(q: str) -> List[Dict[str, Any]]:
    """
    Perform full-text search across title (weight A), summary (B), and body (C).
    Uses the stored search_vector tsvector column for efficient GIN-index search.

    Args:
        q: The search query string.

    Returns:
        List of matching published content item dictionaries.
    """
    try:
        client = get_supabase_client()
        response = (
            client.table("content_items")
            .select("*, content_tags(tags:tag_id(*)), content_media(*)")
            .eq("status", "published")
            .text_search("search_vector", q)
            .execute()
        )
        return [map_content_row(row) for row in response.data] if response.data else []
    except Exception as e:
        logger.error(f"Error searching content items with query '{q}': {e}")
        return []


async def get_series_content(series_id: str) -> List[Dict[str, Any]]:
    """
    Fetch all published items in a content series, ordered by series_order.

    Used for series navigation (prev/next article links within a multi-part series).

    Args:
        series_id: UUID of the content_series row.

    Returns:
        List of content items in reading order (ascending series_order).
    """
    try:
        client = get_supabase_client()
        response = (
            client.table("content_items")
            .select("id, lane, slug, title, summary, series_order, published_at")
            .eq("series_id", series_id)
            .eq("status", "published")
            .order("series_order", desc=False)
            .execute()
        )
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching series content for series_id={series_id}: {e}")
        return []
