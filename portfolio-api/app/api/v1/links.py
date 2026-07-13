from fastapi import APIRouter
from typing import Optional, List
from app.models.schemas import ExternalLinkResponse
from app.services import links_service

router = APIRouter(tags=["links"])


@router.get("/links", response_model=List[ExternalLinkResponse])
async def get_links(category: Optional[str] = None):
    """
    Fetch active outbound external links (social, professional, etc.),
    optionally filtered by category.
    """
    return await links_service.get_active_links(category=category)
