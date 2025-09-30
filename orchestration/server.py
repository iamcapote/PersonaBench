"""ASGI entrypoint for running the orchestration service."""

from .app import create_app

app = create_app()
