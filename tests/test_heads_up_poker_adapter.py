"""Tests for the heads-up poker adapter."""

from __future__ import annotations

from bench.adapters.poker.adapter import HeadsUpPokerAdapter
from bench.core.types import Action


def test_poker_progression_and_showdown() -> None:
    adapter = HeadsUpPokerAdapter(seed=7)
    observation = adapter.reset()

    assert "Heads-Up Poker Practice" in observation.payload["text"]
    assert "Pre-flop" in observation.payload["text"]

    # Pre-flop: check to see the flop
    result = adapter.execute(Action(command="check"))
    assert not result.done
    assert result.info["stage"] == "flop"
    assert "Flop" in result.observation.payload["text"]
    assert "legal moves" in result.observation.payload["text"].lower()

    # Flop and turn checks should progress streets
    result = adapter.execute(Action(command="check"))
    assert not result.done
    assert result.info["stage"] == "turn"

    result = adapter.execute(Action(command="check"))
    assert not result.done
    assert result.info["stage"] == "river"

    # River check moves to showdown and completes the hand
    result = adapter.execute(Action(command="check"))
    assert result.done
    assert result.info["stage"] == "finished"
    assert result.reward in {-1.0, 0.0, 1.0}
    assert result.info["winner"] in {"player", "opponent", "split"}
    assert "Pot" in result.observation.payload["text"]


def test_poker_fold_immediately_finishes_hand() -> None:
    adapter = HeadsUpPokerAdapter(seed=11)
    adapter.reset()

    result = adapter.execute(Action(command="fold"))
    assert result.done
    assert result.reward == -1.0
    assert result.info["winner"] == "opponent"
    assert result.info["legal_moves"] == []


def test_poker_invalid_command_is_rejected() -> None:
    adapter = HeadsUpPokerAdapter(seed=3)
    adapter.reset()

    result = adapter.execute(Action(command="raise"))
    assert not result.done
    assert result.info["valid"] is False
    assert "Invalid move" in result.observation.payload["text"]
    assert "check" in ", ".join(result.info["legal_moves"])