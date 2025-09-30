"""Tests for the prototype solitaire environment adapter."""

from __future__ import annotations

from bench.adapters import SolitaireAdapter
from bench.core.types import Action


def test_solitaire_reset_returns_text_observation() -> None:
    adapter = SolitaireAdapter(seed=123)
    observation = adapter.reset()

    assert "Simple Solitaire" in observation.payload["text"]
    assert "Legal moves" in observation.payload["text"]


def test_solitaire_invalid_command_penalised() -> None:
    adapter = SolitaireAdapter(seed=123)
    adapter.reset()

    result = adapter.execute(Action(command="xyz"))

    assert result.reward < 0
    assert result.info["valid"] is False
    assert "Unrecognised command" in result.observation.payload["text"]


def test_solitaire_draw_then_play_sequence() -> None:
    adapter = SolitaireAdapter(seed=42)
    adapter.reset()

    draw_result = adapter.execute(Action(command="draw"))
    assert draw_result.info["valid"] is True
    assert "draw" in draw_result.info["legal_moves"]

    # Continue drawing until the waste card can be played onto the foundation.
    safety_counter = 0
    while "play" not in draw_result.info["legal_moves"]:
        draw_result = adapter.execute(Action(command="draw"))
        safety_counter += 1
        assert safety_counter < 20, "Should find a playable card within the deck"

    play_result = adapter.execute(Action(command="play"))
    assert play_result.info["valid"] is True
    assert play_result.reward >= 1.0
    assert "Foundation" in play_result.observation.payload["text"]