from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.api.v1 import router as v1_router
from app.exceptions import AppException

# Setup logging before app creation
logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup/shutdown logic"""
    settings = get_settings()
    logger.info(f"Starting {settings.app_name}")
    yield
    logger.info(f"Shutting down {settings.app_name}")


def create_app() -> FastAPI:
    """
    Application factory pattern.

    Creates and configures the FastAPI application with all middleware,
    exception handlers, and routers. This pattern allows tests to
    create fresh app instances with mocked dependencies.
    """
    settings = get_settings()

    # Create app
    application = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS Middleware (CRITICAL: only allow your domain)
    origins = [item.strip() for item in settings.allowed_origins.split(",") if item.strip()]
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # Trusted Host Middleware
    # Include "testserver" for FastAPI TestClient compatibility.
    # "*.onrender.com" is required so Render's internal health checks
    # (which arrive as <service-name>.onrender.com) are accepted.
    application.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            # Production domains (update yourdomain.com when you have a custom domain)
            "yourdomain.com",
            "www.yourdomain.com",
            "api.yourdomain.com",
            # Render free-tier hostname (required for health checks to pass)
            "*.onrender.com",
            # Local development
            "localhost",
            "127.0.0.1",
            # FastAPI TestClient (required for pytest to work)
            "testserver",
        ],
    )

    # Exception handlers
    @application.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        """Handle all custom app exceptions with consistent JSON response."""
        logger.warning(f"AppException: {exc.detail} | Path: {request.url.path}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @application.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Catch-all handler for unhandled exceptions."""
        logger.error(
            f"Unhandled exception: {str(exc)} | Path: {request.url.path}",
            exc_info=exc,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    # Include routers
    application.include_router(v1_router, prefix="/api/v1")

    # Root endpoint
    @application.get("/", tags=["root"])
    async def root():
        """API documentation available at /docs"""
        return {"message": "Portfolio API", "version": "1.0.0"}

    return application


# Create the app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
