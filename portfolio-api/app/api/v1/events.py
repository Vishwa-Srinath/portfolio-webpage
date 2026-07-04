import logging

from fastapi import APIRouter

from app.models.schemas import EventRequest, EventResponse
from app.services.supabase_service import insert_event
from app.exceptions import AppException

router = APIRouter(tags=["events"])
logger = logging.getLogger(__name__)


@router.post("/events", response_model=EventResponse)
async def log_event(request: EventRequest):
    """
    Log a custom analytics event (v1.5+).

    Events are non-critical — the frontend silently ignores failures.
    Recommended events: resume_download, project_link_clicked,
    algo_visualizer_opened, youtube_link_clicked, github_profile_clicked.
    """

    event_id = await insert_event(
        event_name=request.event_name,
        page=request.page,
        metadata=request.metadata,
    )

    if not event_id:
        raise AppException(status_code=500, detail="Failed to log event")

    return EventResponse(success=True, id=event_id)
