"""Integration tests for the tic-tac-toe game master pipeline."""

from __future__ import annotations

from typing import List

from bench.core.types import Action, Observation, Plan
from bench.core.api import PersonaAgent
from bench.games.tic_tac_toe import TicTacToeGame
from harness import MatchRunner


class FirstAvailableAgent(PersonaAgent):
    """Agent that always selects the first legal tic-tac-toe move."""

    def __init__(self, label: str) -> None:
        super().__init__()
        self.name = label

    def plan(self, observation: Observation) -> Plan:
        moves = _legal_moves(observation)
        step = f"play {moves[0]}" if moves else "wait"
        return Plan(rationale="Select first open cell", steps=[step])

    def act(self, plan: Plan, observation: Observation) -> Action:
        del plan
        moves = _legal_moves(observation)
        command = str(moves[0]) if moves else "noop"
        return Action(command=command)


class InvalidThenGreedyAgent(FirstAvailableAgent):
    """Agent that makes one invalid move before playing legally."""

    def __init__(self, label: str) -> None:
        super().__init__(label)
        self._attempted_invalid = False

    def act(self, plan: Plan, observation: Observation) -> Action:
        if not self._attempted_invalid:
            self._attempted_invalid = True
            return Action(command="place 42")
        return super().act(plan, observation)


def _legal_moves(observation: Observation) -> List[str]:
    moves = observation.payload.get("legal_moves", [])
    return [str(move) for move in moves]


def test_tic_tac_toe_match_completes() -> None:
    game = TicTacToeGame()
    agents = {
        "player_x": FirstAvailableAgent("X"),
        "player_o": FirstAvailableAgent("O"),
    }
    runner = MatchRunner(agents, game)
    result = runner.run()

    assert result.completed is True
    assert len(result.turns) <= 9
    assert set(result.scores.keys()) == {"player_x", "player_o"}
    assert abs(sum(result.scores.values())) < 1e-6
    assert "board" in result.status


def test_tic_tac_toe_invalid_move_is_penalised() -> None:
    game = TicTacToeGame()
    agents = {
        "player_x": InvalidThenGreedyAgent("X"),
        "player_o": FirstAvailableAgent("O"),
    }
    runner = MatchRunner(agents, game)
    result = runner.run()

    penalties = [turn for turn in result.turns if turn.info.get("invalid")]
    assert penalties, "Expected at least one invalid turn to be recorded"
    assert penalties[0].reward < 0
    assert penalties[0].player_id == "player_x"
