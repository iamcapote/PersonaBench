"""Application factory for the PersonaBench orchestration service."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from .routes import api_router
from .worker import get_evaluation_worker, reset_evaluation_worker


@asynccontextmanager
async def _lifespan(app: FastAPI):
    worker = get_evaluation_worker()
    worker.start()
    try:
        yield
    finally:
        # Ensure all queued jobs finish before shutdown to avoid orphaned threads in tests.
        reset_evaluation_worker(wait=True)


def create_app() -> FastAPI:
    """Construct and configure the FastAPI application instance."""

    app = FastAPI(
        title="PersonaBench Orchestration Service",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=_lifespan,
    )

    app.include_router(api_router, prefix="/api")

    return app
