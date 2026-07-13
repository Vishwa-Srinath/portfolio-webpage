from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.models.schemas import TechRadarEntryResponse
from app.services import radar_service

router = APIRouter(tags=["radar"])

VALID_STATUSES = ("watching", "trying", "adopted", "dropped")


@router.get("/radar", response_model=List[TechRadarEntryResponse])
async def get_radar(
    status: Optional[str] = Query(
        None,
        description="Filter by status: 'watching', 'trying', 'adopted', 'dropped'",
    ),
    category: Optional[str] = Query(
        None,
        description="Filter by category (free text, e.g. 'framework', 'infra', 'tool')",
    ),
):
    """
    Fetch Tech Radar entries, newest first.
    Optionally filter by status and/or category.
    """
    if status and status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{status}'. Must be one of: {', '.join(VALID_STATUSES)}",
        )
    return await radar_service.get_radar_entries(status=status, category=category)
