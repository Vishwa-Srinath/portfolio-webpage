import logging

from fastapi import APIRouter

from app.models.schemas import HealthCheckResponse
from app.services.supabase_service import check_db_health

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Liveness/readiness probe for container orchestration (Render, etc).
    Checks if the service and database are healthy.

    Reuses the shared supabase_client singleton from supabase_service
    instead of creating a new client on every probe (runs every 30s).
    """

    db_healthy = await check_db_health()
    db_status = "ok" if db_healthy else "error"

    return HealthCheckResponse(
        status="healthy" if db_status == "ok" else "degraded",
        version="1.0.0",
        database=db_status,
    )
