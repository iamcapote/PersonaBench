"""Tests for the blackjack adapter."""

from __future__ import annotations

from bench.adapters.blackjack.adapter import BlackjackAdapter
from bench.core.types import Action


def test_blackjack_reset_includes_expected_text() -> None:
    adapter = BlackjackAdapter(seed=7)
    observation = adapter.reset()

    assert "Blackjack Practice Table" in observation.payload["text"]
    assert "Legal moves" in observation.payload["text"]


def test_blackjack_hit_updates_state() -> None:
    adapter = BlackjackAdapter(seed=11)
    adapter.reset()

    result = adapter.execute(Action(command="hit"))

    assert result.info["player_total"] >= 2
    assert "hit" in result.info["legal_moves"] or result.done is True
    if result.done:
        assert result.info["outcome"] in {"bust", "win", "lose", "push"}


def test_blackjack_stand_resolves_game() -> None:
    adapter = BlackjackAdapter(seed=3)
    adapter.reset()

    result = adapter.execute(Action(command="stand"))

    assert result.done is True
    assert result.info["outcome"] in {"win", "lose", "push"}
    assert result.reward != 0.0


def test_blackjack_invalid_command_penalised() -> None:
    adapter = BlackjackAdapter(seed=5)
    adapter.reset()

    result = adapter.execute(Action(command="double"))

    assert result.done is True
    assert result.reward < 0
    assert result.info["legal_moves"] == []
