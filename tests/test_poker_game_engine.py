"""Integration tests for the heads-up poker engine."""

from __future__ import annotations

from bench.core.api import PersonaAgent
from bench.core.types import Action, Observation, Plan
from bench.games.poker.engine import HeadsUpPokerGame
from harness import MatchRunner


class PassivePokerAgent(PersonaAgent):
    """Agent that checks and calls to reach showdown."""

    def __init__(self, label: str) -> None:
        super().__init__()
        self.name = label
        self._attempted_invalid = False

    def plan(self, observation: Observation) -> Plan:
        return Plan(rationale="Play heads-up poker", steps=["select action"])

    def act(self, plan: Plan, observation: Observation) -> Action:
        del plan
        legal_moves = list(observation.payload.get("legal_moves", []))
        if not legal_moves:
            return Action(command="wait")
        if "call" in legal_moves:
            return Action(command="call")
        if "check" in legal_moves:
            return Action(command="check")
        if "bet" in legal_moves:
            return Action(command="bet")
        return Action(command="fold")


class InvalidPokerAgent(PassivePokerAgent):
    """Agent that intentionally submits an invalid action first."""

    def act(self, plan: Plan, observation: Observation) -> Action:  # type: ignore[override]
        if not self._attempted_invalid:
            self._attempted_invalid = True
            return Action(command="raise")
        return super().act(plan, observation)


def test_heads_up_poker_match_completes() -> None:
    game = HeadsUpPokerGame(seed=321)
    agents = {
        "player_button": PassivePokerAgent("Button"),
        "player_big_blind": PassivePokerAgent("Big Blind"),
    }

    runner = MatchRunner(agents, game)
    result = runner.run()

    assert result.completed is True
    assert set(result.scores.keys()) == {"player_button", "player_big_blind"}
    assert result.status["terminal"] is True
    assert "stage" in result.status


def test_heads_up_poker_invalid_action_penalised() -> None:
    game = HeadsUpPokerGame(seed=99)
    agents = {
        "player_button": InvalidPokerAgent("Button"),
        "player_big_blind": PassivePokerAgent("Big Blind"),
    }

    runner = MatchRunner(agents, game)
    result = runner.run()

    penalties = [turn for turn in result.turns if turn.info.get("invalid")]
    assert penalties, "Expected an invalid move to be recorded"
    assert penalties[0].player_id == "player_button"
    assert penalties[0].reward < 0
