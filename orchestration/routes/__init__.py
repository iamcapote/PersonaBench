"""Route registry for the orchestration service."""

from __future__ import annotations

from fastapi import APIRouter

from .admin_audit import router as admin_audit_router
from .admin_evaluations import router as admin_evaluations_router
from .admin_queue import router as admin_queue_router
from .evaluations import router as evaluations_router
from .games import router as games_router
from .personas import router as personas_router
from .scenarios import router as scenarios_router

api_router = APIRouter()

api_router.include_router(personas_router)
api_router.include_router(scenarios_router)
api_router.include_router(games_router)
api_router.include_router(evaluations_router)
api_router.include_router(admin_queue_router)
api_router.include_router(admin_audit_router)
api_router.include_router(admin_evaluations_router)

__all__ = ["api_router"]
