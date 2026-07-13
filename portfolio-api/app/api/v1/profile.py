from fastapi import APIRouter, HTTPException
from app.models.schemas import ProfileResponse
from app.services import profile_service

router = APIRouter(tags=["profile"])


@router.get("/profile", response_model=ProfileResponse)
async def get_profile():
    """
    Fetch the site owner's biography, education, skills, and timeline.
    """
    profile = await profile_service.get_profile()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
