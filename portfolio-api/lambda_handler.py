"""AWS Lambda entry point for the existing FastAPI application."""

from mangum import Mangum

from app.main import app


# Function URLs emit API Gateway v2-style events, which Mangum translates to ASGI.
handler = Mangum(app, lifespan="auto")
