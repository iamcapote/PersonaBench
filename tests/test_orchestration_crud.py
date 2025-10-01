"""Integration tests for persona and scenario CRUD endpoints."""

from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

import yaml
from fastapi.testclient import TestClient

from orchestration.app import create_app
from orchestration import catalog


def _cleanup_path(path: Path) -> None:
    if path.exists():
        path.unlink()
    parent = path.parent
    try:
        parent.rmdir()
    except OSError:
        pass


def test_persona_create_and_update(admin_headers) -> None:
    app = create_app()
    client = TestClient(app)
    client.headers.update(admin_headers)

    persona_name = f"Test Persona {uuid4().hex[:6]}"
    definition = {
        "name": persona_name,
        "version": "1.0.0",
        "planning_horizon": 3,
        "risk_tolerance": 0.4,
        "description": "Temporary persona for CRUD tests",
        "tools": {"allowed": ["search", "calculator"]},
    }

    persona_path = catalog.persona_file_path(persona_name)

    try:
        response = client.post("/api/personas", json={"definition": definition})
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["name"] == persona_name
        assert persona_path.exists()

        stored = json.loads(persona_path.read_text(encoding="utf-8"))
        assert stored["planning_horizon"] == 3
        assert "created_at" in stored["metadata"]
        original_updated_at = stored["metadata"]["updated_at"]

        duplicate = client.post("/api/personas", json={"definition": definition})
        assert duplicate.status_code == 409

        definition["planning_horizon"] = 5
        definition["version"] = "1.0.1"
        update = client.put(f"/api/personas/{persona_name}", json={"definition": definition})
        assert update.status_code == 200, update.text
        updated = json.loads(persona_path.read_text(encoding="utf-8"))
        assert updated["planning_horizon"] == 5
        assert updated["metadata"]["updated_at"] != original_updated_at
    finally:
        _cleanup_path(persona_path)
        catalog.invalidate_persona_cache()


def test_scenario_create_and_update(admin_headers) -> None:
    app = create_app()
    client = TestClient(app)
    client.headers.update(admin_headers)

    scenario_id = f"poker-crud-{uuid4().hex[:5]}"
    environment = "custom"
    definition = {
        "id": scenario_id,
        "mode": "simulation",
        "checks": {"type": "noop"},
        "metadata": {
            "description": "Temporary CRUD scenario",
            "domain": "games",
            "tags": ["poker", "crud"],
        },
    }

    scenario_path = catalog.scenario_file_path(scenario_id, environment)

    try:
        response = client.post(
            "/api/scenarios",
            json={"environment": environment, "definition": definition},
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["key"] == scenario_id
        assert data["environment"] == environment
        assert scenario_path.exists()

        stored = yaml.safe_load(scenario_path.read_text(encoding="utf-8"))
        assert stored["metadata"]["description"] == "Temporary CRUD scenario"
        original_updated_at = stored["metadata"]["updated_at"]

        duplicate = client.post(
            "/api/scenarios",
            json={"environment": environment, "definition": definition},
        )
        assert duplicate.status_code == 409

        definition["metadata"]["description"] = "Updated description"
        update = client.put(
            f"/api/scenarios/{scenario_id}",
            json={"environment": environment, "definition": definition},
        )
        assert update.status_code == 200, update.text
        updated = yaml.safe_load(scenario_path.read_text(encoding="utf-8"))
        assert updated["metadata"]["description"] == "Updated description"
        assert updated["metadata"]["updated_at"] != original_updated_at

        env_mismatch = client.put(
            f"/api/scenarios/{scenario_id}",
            json={"environment": "another", "definition": definition},
        )
        assert env_mismatch.status_code == 422
    finally:
        _cleanup_path(scenario_path)
        catalog.invalidate_scenario_cache()