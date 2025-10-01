"""Pytest fixtures shared across PersonaBench test modules."""

from __future__ import annotations

import os

import pytest

_ADMIN_KEY = "test-admin-key"


@pytest.fixture(autouse=True)
def _set_admin_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure the orchestration service enforces a deterministic admin key during tests."""

    monkeypatch.setenv("PERSONABENCH_ADMIN_KEY", _ADMIN_KEY)


@pytest.fixture()
def admin_headers() -> dict[str, str]:
    """Return default headers satisfying the admin key check."""

    return {"x-admin-key": _ADMIN_KEY}
