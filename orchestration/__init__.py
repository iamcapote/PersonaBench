"""FastAPI orchestration service for PersonaBench.

This package hosts the web service responsible for exposing personas,
scenarios, and evaluation orchestration endpoints backed by LangChain.
"""

from .app import create_app

__all__ = ["create_app"]
