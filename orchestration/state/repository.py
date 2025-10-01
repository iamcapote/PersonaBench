"""JSON-backed persistence utilities for orchestration state."""

from __future__ import annotations

import json
from pathlib import Path
from threading import Lock
from typing import Any, Dict, MutableMapping

STATE_DIR = Path(__file__).resolve().parent / "data"
STATE_PATH = STATE_DIR / "admin_state.json"
STATE_LOCK = Lock()

_STATE_KEYS = ("queue", "audit", "responses", "pairs", "votes")


def _ensure_state_dir() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def load_state() -> Dict[str, Any]:
    """Load the persisted admin state (ensuring expected collections)."""

    if STATE_PATH.exists():
        try:
            with STATE_PATH.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            if isinstance(data, MutableMapping):
                state: Dict[str, Any] = dict(data)
                for key in _STATE_KEYS:
                    state.setdefault(key, [])
                return state
        except json.JSONDecodeError:
            pass
    return {key: [] for key in _STATE_KEYS}


def persist_state(state: Dict[str, Any]) -> None:
    """Persist the provided state dictionary atomically."""

    _ensure_state_dir()
    tmp_path = STATE_PATH.with_suffix(".tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(state, handle, indent=2, ensure_ascii=False)
    tmp_path.replace(STATE_PATH)


def clear_state() -> None:
    """Remove the persisted state file (used in tests)."""

    with STATE_LOCK:
        if STATE_PATH.exists():
            STATE_PATH.unlink()

__all__ = [
    "STATE_DIR",
    "STATE_PATH",
    "STATE_LOCK",
    "clear_state",
    "load_state",
    "persist_state",
]
