"""Helper utilities shared across orchestration route modules."""

from __future__ import annotations

from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent


def relative_source_path(value: str | None) -> str | None:
    """Return the repository-relative path for a given absolute path string."""

    if not value:
        return None

    path = Path(value)
    try:
        return str(path.relative_to(_REPO_ROOT))
    except ValueError:
        return str(path)
