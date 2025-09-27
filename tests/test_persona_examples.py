"""Smoke tests ensuring persona examples satisfy required fields."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

REQUIRED_FIELDS = {"name", "version", "planning_horizon", "risk_tolerance", "tools"}


@pytest.mark.parametrize("persona_path", Path("personas/examples").glob("*.json"))
def test_persona_has_required_fields(persona_path: Path) -> None:
    with persona_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    missing = REQUIRED_FIELDS - data.keys()
    assert not missing, f"Missing required fields: {missing}"
