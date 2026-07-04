from fastapi import APIRouter

from app.api.v1 import contact, health, events

router = APIRouter()

# Include endpoint routers
router.include_router(contact.router)
router.include_router(health.router)
router.include_router(events.router)
