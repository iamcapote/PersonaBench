"""Tests for transparency assets surfaced by the orchestration service."""

from __future__ import annotations

from fastapi.testclient import TestClient

from orchestration.app import create_app


def test_game_assets_include_manifest_and_adapter() -> None:
    app = create_app()
    client = TestClient(app)

    response = client.get("/api/games/poker-practice/assets")
    assert response.status_code == 200, response.text
    payload = response.json()

    manifest = payload["manifest"]
    assert manifest["path"].endswith("games/poker/practice.yaml")
    assert "poker-practice" in manifest["content"]
    assert manifest["language"] == "yaml"

    adapter = payload["adapter"]
    assert adapter is not None
    assert adapter["path"].endswith("bench/adapters/poker/adapter.py")
    assert "HeadsUpPokerAdapter" in adapter["content"]
    assert adapter["language"] == "python"

    # Poker practice does not have a dedicated rule pack today.
    assert payload["rule_pack"] is None


def test_game_assets_missing_game_returns_404() -> None:
    app = create_app()
    client = TestClient(app)

    response = client.get("/api/games/does-not-exist/assets")
    assert response.status_code == 404
