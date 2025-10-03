"""Heads-up poker practice adapter leveraging shared poker utilities."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import List, Sequence

from ...core.api import EnvAdapter
from ...core.types import Action, Observation, StepResult
from ...games.poker.cards import (
    Card,
    best_hand_rank,
    build_deck,
    format_cards,
    legal_moves_for_stage,
    stage_label,
)


@dataclass
class PokerState:
    """Mutable state for the simplified heads-up poker environment."""

    stage: str = "preflop"
    player_hand: List[Card] = field(default_factory=list)
    opponent_hand: List[Card] = field(default_factory=list)
    board: List[Card] = field(default_factory=list)
    board_plan: List[Card] = field(default_factory=list)
    pot: int = 0
    history: List[str] = field(default_factory=list)
    message: str = ""
    done: bool = False
    reward: float = 0.0
    winner: str | None = None


@dataclass
class PokerOutcome:
    description: str
    reward: float
    done: bool
    legal_moves: Sequence[str]
    valid: bool
    stage: str
    winner: str | None
    pot: int
    history: Sequence[str]


class HeadsUpPokerEnv:
    """Deterministic limit hold'em practice environment for a single trainee."""

    def __init__(self, seed: int | None = None) -> None:
        self._seed = seed
        self._rng = random.Random(seed)
        self._state: PokerState | None = None

    def reset(self) -> str:
        deck = build_deck()
        self._rng.shuffle(deck)

        player_hand = [deck.pop(), deck.pop()]
        opponent_hand = [deck.pop(), deck.pop()]
        board_plan = [deck.pop() for _ in range(5)]

        self._state = PokerState(
            stage="preflop",
            player_hand=player_hand,
            opponent_hand=opponent_hand,
            board=[],
            board_plan=board_plan,
            pot=2,
            history=["Blinds posted. Hand begins."],
            message="You are on the button.",
        )
        return self._render_state()

    def step(self, command: str) -> PokerOutcome:
        if self._state is None:
            raise RuntimeError("Environment must be reset before stepping")

        state = self._state
        if state.done:
            return self._snapshot(valid=False, message="Hand already concluded.")

        normalized = command.strip().lower()
        legal_moves = list(legal_moves_for_stage(state.stage))
        if normalized not in legal_moves:
            state.message = "Invalid move. Choose from the listed legal moves."
            state.history.append(f"Player attempted illegal action: {command}.")
            return self._snapshot(valid=False)

        if normalized == "fold":
            return self._handle_fold(state)

        if normalized == "bet":
            return self._handle_bet(state)

        if normalized == "call":
            return self._handle_call(state)

        # Default action: check
        state.history.append("Player checks.")
        state.message = "Check recorded."
        self._advance_stage(state)
        return self._snapshot(valid=True)

    def _handle_fold(self, state: PokerState) -> PokerOutcome:
        state.done = True
        state.reward = -1.0
        state.winner = "opponent"
        state.stage = "finished"
        state.message = "You folded. Opponent takes the pot."
        state.history.append("Player folds. Opponent wins the pot.")
        return self._snapshot(valid=True)

    def _handle_bet(self, state: PokerState) -> PokerOutcome:
        state.pot += 1
        state.history.append("Player bets one chip.")
        if self._opponent_calls(state):
            state.pot += 1
            state.history.append("Opponent calls the bet.")
            state.message = "Opponent calls. Moving to the next street."
            self._advance_stage(state)
            return self._snapshot(valid=True)

        state.done = True
        state.reward = 1.0
        state.winner = "player"
        state.stage = "finished"
        state.message = "Opponent folds. Pot awarded."
        state.history.append("Opponent folds to the bet.")
        return self._snapshot(valid=True)

    def _handle_call(self, state: PokerState) -> PokerOutcome:
        state.pot += 1
        state.history.append("Player calls the outstanding bet.")
        state.message = "Call recorded."
        self._advance_stage(state)
        return self._snapshot(valid=True)

    def _advance_stage(self, state: PokerState) -> None:
        if state.stage == "preflop":
            state.board = state.board_plan[:3]
            state.stage = "flop"
            state.message = "Flop revealed."
            state.history.append("Flop dealt.")
        elif state.stage == "flop":
            state.board = state.board_plan[:4]
            state.stage = "turn"
            state.message = "Turn card revealed."
            state.history.append("Turn dealt.")
        elif state.stage == "turn":
            state.board = state.board_plan[:5]
            state.stage = "river"
            state.message = "River card revealed."
            state.history.append("River dealt.")
        elif state.stage == "river":
            state.stage = "showdown"
            self._resolve_showdown(state)
        elif state.stage == "showdown":
            state.stage = "finished"
            state.done = True
        else:
            state.stage = "finished"
            state.done = True

    def _resolve_showdown(self, state: PokerState) -> None:
        player_rank = best_hand_rank(state.player_hand + state.board)
        opponent_rank = best_hand_rank(state.opponent_hand + state.board)
        if player_rank > opponent_rank:
            state.reward = 1.0
            state.winner = "player"
            state.history.append("Showdown: player wins the hand.")
            state.message = "You won the hand at showdown."
        elif player_rank < opponent_rank:
            state.reward = -1.0
            state.winner = "opponent"
            state.history.append("Showdown: opponent wins the hand.")
            state.message = "Opponent wins at showdown."
        else:
            state.reward = 0.0
            state.winner = "split"
            state.history.append("Showdown: hand ends in a split pot.")
            state.message = "Split pot at showdown."
        state.done = True
        state.stage = "finished"

    def _opponent_calls(self, state: PokerState) -> bool:
        full_board = state.board_plan[:5]
        rank = best_hand_rank(state.opponent_hand + full_board)
        category_threshold = {
            "preflop": 1,
            "flop": 1,
            "turn": 2,
            "river": 2,
        }.get(state.stage, 1)
        if rank[0] >= category_threshold:
            return True
        if rank[0] == 0 and rank[1] and max(rank[1]) >= 13:
            return True
        return False

    def _snapshot(self, valid: bool, message: str | None = None) -> PokerOutcome:
        if self._state is None:
            raise RuntimeError("Environment state unavailable")
        state = self._state
        if message is not None:
            state.message = message
        description = self._render_state()
        legal_moves = [] if state.done else list(legal_moves_for_stage(state.stage))
        return PokerOutcome(
            description=description,
            reward=state.reward,
            done=state.done,
            legal_moves=legal_moves,
            valid=valid,
            stage=state.stage,
            winner=state.winner,
            pot=state.pot,
            history=list(state.history),
        )

    def _render_state(self) -> str:
        if self._state is None:
            raise RuntimeError("Environment state unavailable")
        state = self._state
        lines = [
            "Heads-Up Poker Practice",
            f"Stage: {stage_label(state.stage)}",
            f"Your hand: {format_cards(state.player_hand)}",
            f"Board: {format_cards(state.board)}",
            f"Pot: {state.pot} chips",
        ]
        legal_moves = [] if state.done else list(legal_moves_for_stage(state.stage))
        lines.append(f"Legal moves: {', '.join(legal_moves) or 'none'}")
        if state.message:
            lines.append(f"Feedback: {state.message}")
        return "\n".join(lines)


class HeadsUpPokerAdapter(EnvAdapter):
    """EnvAdapter wrapper for the heads-up poker practice environment."""

    name = "heads_up_poker"

    def __init__(self, seed: int | None = None) -> None:
        self._env = HeadsUpPokerEnv(seed=seed)

    def reset(self) -> Observation:
        description = self._env.reset()
        return Observation(payload={"text": description})

    def execute(self, action: Action) -> StepResult:
        command = self._coerce_command(action)
        outcome = self._env.step(command)
        observation = Observation(payload={"text": outcome.description})
        info = {
            "legal_moves": list(outcome.legal_moves),
            "valid": outcome.valid,
            "stage": outcome.stage,
            "winner": outcome.winner,
            "pot": outcome.pot,
            "history": list(outcome.history),
        }
        return StepResult(
            observation=observation,
            reward=outcome.reward,
            done=outcome.done,
            info=info,
        )

    @staticmethod
    def _coerce_command(action: Action) -> str:
        if isinstance(action.command, str):
            return action.command
        if action.command is None and "command" in action.arguments:
            return str(action.arguments["command"])
        return str(action.command)


__all__ = ["HeadsUpPokerAdapter", "HeadsUpPokerEnv"]