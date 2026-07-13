import logging
from typing import Optional, List, Dict, Any
from app.services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)


async def get_youtube_videos(featured: Optional[bool] = None) -> List[Dict[str, Any]]:
    """
    Fetch cached YouTube videos, ordered by published_at descending.

    Only returns visible videos (is_visible = true). The RLS policy also
    enforces this at the database level, but filtering here avoids surprises
    if the service-role key is used (which bypasses RLS).

    Args:
        featured: If True, return only pinned/featured videos.
                  If False, return only non-featured videos.
                  If None, return all visible videos.

    Returns:
        List of video dictionaries from the youtube_videos cache table.
    """
    try:
        client = get_supabase_client()
        query = client.table("youtube_videos").select("*").eq("is_visible", True)
        if featured is not None:
            query = query.eq("is_featured", featured)
        response = query.order("published_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching YouTube videos: {e}")
        return []


async def upsert_youtube_video(video_data: Dict[str, Any]) -> Optional[str]:
    """
    Upsert a single YouTube video into the cache table.

    Called by the sync pipeline (scheduled GitHub Action / n8n cron).
    Deduplicates on video_id (YouTube's natural unique key).

    Args:
        video_data: Dict with keys matching youtube_videos columns.
                    Must include 'video_id'.

    Returns:
        The UUID of the upserted row, or None on failure.
    """
    try:
        client = get_supabase_client()
        response = (
            client.table("youtube_videos")
            .upsert(video_data, on_conflict="video_id")
            .execute()
        )
        if response.data:
            return response.data[0]["id"]
        return None
    except Exception as e:
        logger.error(f"Error upserting YouTube video {video_data.get('video_id')}: {e}")
        return None
