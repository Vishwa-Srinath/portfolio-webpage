from fastapi import APIRouter

from app.api.v1 import contact, health, events, profile, links, content, radar, youtube

router = APIRouter()

# Include endpoint routers
router.include_router(contact.router)
router.include_router(health.router)
router.include_router(events.router)
router.include_router(profile.router)
router.include_router(links.router)
router.include_router(content.router)
router.include_router(radar.router)
router.include_router(youtube.router)
