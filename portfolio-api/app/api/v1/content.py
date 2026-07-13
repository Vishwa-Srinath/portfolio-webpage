from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.models.schemas import ContentItemResponse
from app.services import content_service

router = APIRouter(tags=["content"])


@router.get("/content", response_model=List[ContentItemResponse])
async def get_content(
    lane: Optional[str] = Query(
        None, description="Filter by lane: 'projects', 'learn', 'stories', 'notes'"
    )
):
    """
    Fetch all published content items, optionally filtered by lane.
    """
    if lane and lane not in ("projects", "learn", "stories", "notes"):
        raise HTTPException(status_code=400, detail="Invalid lane parameter")
    return await content_service.get_content_items(lane=lane)


@router.get("/content/{lane}/{slug}", response_model=ContentItemResponse)
async def get_content_by_slug(lane: str, slug: str):
    """
    Fetch a single published content item by its lane and slug.
    """
    if lane not in ("projects", "learn", "stories", "notes"):
        raise HTTPException(status_code=400, detail="Invalid lane parameter")

    item = await content_service.get_content_item_by_slug(lane=lane, slug=slug)
    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"Content item '{slug}' not found in lane '{lane}'",
        )
    return item


@router.get("/search", response_model=List[ContentItemResponse])
async def search_content(
    q: str = Query(..., min_length=1, description="Search query")
):
    """
    Search published content items using Full-Text Search.
    """
    return await content_service.search_content(q=q)
