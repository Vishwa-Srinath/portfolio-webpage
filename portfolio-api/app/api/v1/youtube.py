from fastapi import APIRouter
from typing import Optional, List
from app.models.schemas import YouTubeVideoResponse
from app.services import youtube_service

router = APIRouter(tags=["youtube"])


@router.get("/youtube", response_model=List[YouTubeVideoResponse])
async def get_youtube(featured: Optional[bool] = None):
    """
    Fetch cached YouTube videos, optionally filtered by featured status.
    """
    return await youtube_service.get_youtube_videos(featured=featured)
