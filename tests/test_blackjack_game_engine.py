"""Integration tests for the Blackjack turn-based engine."""

from __future__ import annotations

from bench.core.api import PersonaAgent
from bench.core.types import Action, Observation, Plan
from bench.games.blackjack.engine import BlackjackGame
from harness import MatchRunner


class ThresholdBlackjackAgent(PersonaAgent):
    """Agent that hits until reaching a configurable total."""

    def __init__(self, label: str, threshold: int = 17) -> None:
        super().__init__()
        self.name = label
        self._threshold = threshold
        self._attempted_invalid = False

    def plan(self, observation: Observation) -> Plan:
        return Plan(rationale="Play blackjack", steps=["choose move"])

    def act(self, plan: Plan, observation: Observation) -> Action:
        del plan
        legal_moves = list(observation.payload.get("legal_moves", []))
        if not legal_moves:
            return Action(command="wait")

        total = int(observation.payload.get("hand_total", 0))
        if total < self._threshold and "hit" in legal_moves:
            return Action(command="hit")
        return Action(command="stand")


class InvalidBlackjackAgent(ThresholdBlackjackAgent):
    """Agent that intentionally plays an invalid move before behaving."""

    def act(self, plan: Plan, observation: Observation) -> Action:  # type: ignore[override]
        if not self._attempted_invalid:
            self._attempted_invalid = True
            return Action(command="double")
        return super().act(plan, observation)


def test_blackjack_match_completes() -> None:
    game = BlackjackGame(players=("alice", "bob"), seed=42)
    agents = {
        "alice": ThresholdBlackjackAgent("Alice", threshold=16),
        "bob": ThresholdBlackjackAgent("Bob", threshold=18),
    }

    runner = MatchRunner(agents, game)
    result = runner.run()

    assert result.completed is True
    assert set(result.scores.keys()) == {"alice", "bob"}
    assert result.status["terminal"] is True
    assert "dealer_hand" in result.status


def test_blackjack_invalid_command_penalised() -> None:
    game = BlackjackGame(players=("alice", "bob"), seed=17)
    agents = {
        "alice": InvalidBlackjackAgent("Alice"),
        "bob": ThresholdBlackjackAgent("Bob"),
    }

    runner = MatchRunner(agents, game)
    result = runner.run()

    penalties = [turn for turn in result.turns if turn.info.get("invalid")]
    assert penalties, "Expected an invalid move to be recorded"
    assert penalties[0].player_id == "alice"
    assert penalties[0].reward < 0
