"""Helper utilities shared across orchestration state modules."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Iterable, MutableMapping, Optional


def normalize_metadata(payload: Any) -> Dict[str, Any]:
    """Return a shallow copy of metadata dictionaries."""

    if isinstance(payload, MutableMapping):
        return dict(payload)
    return {}


def sanitize_metadata(payload: Any) -> Dict[str, Any]:
    """Remove sensitive persona-prefixed keys from metadata payloads."""

    if not isinstance(payload, MutableMapping):
        return {}

    sanitized: Dict[str, Any] = {}
    for key, value in payload.items():
        if key.lower().startswith("persona_"):
            continue
        sanitized[key] = value
    return sanitized


def normalize_for_storage(value: Any) -> Any:
    """Recursively convert complex values into JSON-serialisable types."""

    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, MutableMapping):
        return {key: normalize_for_storage(item) for key, item in value.items()}
    if isinstance(value, Iterable) and not isinstance(value, (str, bytes)):
        return [normalize_for_storage(item) for item in value]
    return value


def parse_timestamp(value: Any) -> Optional[datetime]:
    """Best-effort ISO-8601 timestamp parser."""

    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        try:
            normalized = value.replace("Z", "+00:00")
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None
    return None

__all__ = ["normalize_for_storage", "normalize_metadata", "parse_timestamp", "sanitize_metadata"]
