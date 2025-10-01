"""Lightweight admin authentication utilities for the orchestration service."""

from __future__ import annotations

import os
from typing import Final

from fastapi import HTTPException, Request, status

ADMIN_KEY_ENV: Final[str] = "PERSONABENCH_ADMIN_KEY"
HEADER_NAME: Final[str] = "x-admin-key"
QUERY_PARAM: Final[str] = "admin_key"


def _current_secret() -> str | None:
	"""Return the configured admin secret or ``None`` when disabled."""

	secret = os.getenv(ADMIN_KEY_ENV)
	if secret:
		return secret.strip()
	return None


def require_admin(request: Request) -> None:
	"""Enforce that the caller provides the configured admin secret.

	The check is intentionally simple:
	- Admin enforcement is active only when :data:`PERSONABENCH_ADMIN_KEY` is set.
	- Callers provide the secret via the ``X-Admin-Key`` header or ``admin_key`` query parameter.
	- On mismatch, the request is rejected with ``403 Forbidden``.
	"""

	secret = _current_secret()
	if secret is None:
		return

	received = request.headers.get(HEADER_NAME, "") or request.query_params.get(QUERY_PARAM, "")
	if received != secret:
		raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Admin access required")
