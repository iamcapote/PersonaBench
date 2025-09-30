"""Application factory for the PersonaBench orchestration service."""

from fastapi import FastAPI

from .routes import api_router


def create_app() -> FastAPI:
    """Construct and configure the FastAPI application instance."""

    app = FastAPI(
        title="PersonaBench Orchestration Service",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.include_router(api_router, prefix="/api")

    return app
