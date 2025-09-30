"""Heads-up poker practice adapter for PersonaBench."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from itertools import combinations
from typing import Iterable, List, Sequence, Tuple

from ...core.api import EnvAdapter
from ...core.types import Action, Observation, StepResult

RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
SUITS = ["♠", "♥", "♦", "♣"]
RANK_VALUES = {rank: index + 2 for index, rank in enumerate(RANKS)}


@dataclass
class PokerState:
    """Mutable state for the heads-up poker environment."""

    stage: str
    player_hand: List[Tuple[str, str]]
    opponent_hand: List[Tuple[str, str]]
    board: List[Tuple[str, str]]
    board_plan: List[Tuple[str, str]]
    pot: int
    history: List[str] = field(default_factory=list)
    done: bool = False
    reward: float = 0.0
    winner: str | None = None
    message: str | None = None


@dataclass
class PokerOutcome:
    """Container returned after each environment step."""

    description: str
    reward: float
    done: bool
    legal_moves: List[str]
    valid: bool
    stage: str
    winner: str | None
    pot: int
    history: List[str]


def _card_label(card: Tuple[str, str]) -> str:
    return f"{card[0]}{card[1]}"


def _format_cards(cards: Iterable[Tuple[str, str]]) -> str:
    rendered = ", ".join(_card_label(card) for card in cards)
    return rendered or "—"


def _legal_moves_for_stage(stage: str) -> List[str]:
    if stage in {"showdown", "finished"}:
        return []
    return ["check", "bet", "fold"]


def _stage_label(stage: str) -> str:
    labels = {
        "preflop": "Pre-flop",
        "flop": "Flop",
        "turn": "Turn",
        "river": "River",
        "showdown": "Showdown",
        "finished": "Hand Complete",
    }
    return labels.get(stage, stage.title())


def _hand_rank(hand: Sequence[Tuple[str, str]]) -> Tuple[int, Tuple[int, ...]]:
    """Return a comparable rank tuple for a 5-card poker hand."""

    values = sorted((RANK_VALUES[card[0]] for card in hand), reverse=True)
    suits = [card[1] for card in hand]
    value_counts = {value: values.count(value) for value in set(values)}
    ordered_counts = sorted(
        value_counts.items(), key=lambda item: (item[1], item[0]), reverse=True
    )
    is_flush = len(set(suits)) == 1

    unique_values = sorted(set(values))
    is_wheel = unique_values == [2, 3, 4, 5, 14]
    if len(unique_values) == 5:
        highest = max(unique_values)
        is_straight = highest - min(unique_values) == 4 or is_wheel
    else:
        is_straight = False
        highest = None

    if is_straight and is_flush:
        straight_high = 5 if is_wheel else highest
        return (8, (straight_high,))

    if 4 in value_counts.values():
        four_value = next(value for value, count in value_counts.items() if count == 4)
        kicker = max(value for value, count in value_counts.items() if count == 1)
        return (7, (four_value, kicker))

    if sorted(value_counts.values()) == [2, 3]:
        three_value = next(value for value, count in value_counts.items() if count == 3)
        pair_value = max(value for value, count in value_counts.items() if count == 2)
        return (6, (three_value, pair_value))

    if is_flush:
        return (5, tuple(values))

    if is_straight:
        straight_high = 5 if is_wheel else highest
        return (4, (straight_high,))

    if 3 in value_counts.values():
        three_value = next(value for value, count in value_counts.items() if count == 3)
        kickers = sorted(
            (value for value, count in value_counts.items() if count == 1), reverse=True
        )
        return (3, (three_value, *kickers))

    pairs = [value for value, count in ordered_counts if count == 2]
    if len(pairs) == 2:
        kicker = max(value for value, count in value_counts.items() if count == 1)
        return (2, (pairs[0], pairs[1], kicker))

    if 2 in value_counts.values():
        pair_value = pairs[0]
        kickers = sorted(
            (value for value, count in value_counts.items() if count == 1), reverse=True
        )
        return (1, (pair_value, *kickers))

    return (0, tuple(values))


def _best_hand_rank(cards: Sequence[Tuple[str, str]]) -> Tuple[int, Tuple[int, ...]]:
    best_rank: Tuple[int, Tuple[int, ...]] | None = None
    for combo in combinations(cards, 5):
        rank = _hand_rank(combo)
        if best_rank is None or rank > best_rank:
            best_rank = rank
    assert best_rank is not None  # combinations ensures at least one hand
    return best_rank


class HeadsUpPokerEnv:
    """Deterministic heads-up limit hold'em environment with simple betting."""

    def __init__(self, seed: int | None = None) -> None:
        self._rng = random.Random(seed)
        self._state: PokerState | None = None

    def reset(self) -> str:
        deck = [(rank, suit) for rank in RANKS for suit in SUITS]
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
        )
        self._state.message = "You are on the button."
        return self._render_state()

    def step(self, command: str) -> PokerOutcome:
        if self._state is None:
            raise RuntimeError("Environment must be reset before stepping")

        state = self._state
        if state.done:
            return self._snapshot(valid=False, message="Hand already concluded.")

        normalized = command.strip().lower()
        legal_moves = _legal_moves_for_stage(state.stage)
        if normalized not in legal_moves:
            state.message = "Invalid move. Choose from the listed legal moves."
            return self._snapshot(valid=False)

        if normalized == "fold":
            state.done = True
            state.reward = -1.0
            state.winner = "opponent"
            state.history.append("Player folds. Opponent wins the pot.")
            state.message = "You folded. Opponent takes the pot."
            state.stage = "finished"
            return self._snapshot(valid=True)

        if normalized == "bet":
            state.pot += 1
            state.history.append("Player bets one chip.")
            if self._opponent_calls(state):
                state.pot += 1
                state.history.append("Opponent calls the bet.")
                state.message = "Opponent calls. Moving to the next street."
                self._advance_stage(state)
            else:
                state.done = True
                state.reward = 1.0
                state.winner = "player"
                state.message = "Opponent folds. Pot awarded."
                state.history.append("Opponent folds to the bet.")
                state.stage = "finished"
                return self._snapshot(valid=True)
        else:  # "check"
            state.history.append("Player checks.")
            state.message = "Check recorded."
            self._advance_stage(state)

        return self._snapshot(valid=True)

    def _advance_stage(self, state: PokerState) -> None:
        if state.stage == "preflop":
            state.board = state.board_plan[:3]
            state.stage = "flop"
            state.message = "Flop revealed."
        elif state.stage == "flop":
            state.board = state.board_plan[:4]
            state.stage = "turn"
            state.message = "Turn card revealed."
        elif state.stage == "turn":
            state.board = state.board_plan[:5]
            state.stage = "river"
            state.message = "River card revealed."
        elif state.stage == "river":
            state.board = state.board_plan[:5]
            state.stage = "showdown"
            self._resolve_showdown(state)
        elif state.stage == "showdown":
            state.stage = "finished"
            state.done = True
        else:
            state.done = True
            state.stage = "finished"

    def _resolve_showdown(self, state: PokerState) -> None:
        player_rank = _best_hand_rank(state.player_hand + state.board)
        opponent_rank = _best_hand_rank(state.opponent_hand + state.board)
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
        final_board = state.board_plan[:5]
        rank = _best_hand_rank(state.opponent_hand + final_board)
        category = rank[0]
        category_threshold = {
            "preflop": 1,
            "flop": 1,
            "turn": 2,
            "river": 2,
        }.get(state.stage, 1)
        if category >= category_threshold:
            return True
        if category == 0 and rank[1] and max(rank[1]) >= 13:
            return True
        return False

    def _snapshot(self, valid: bool, message: str | None = None) -> PokerOutcome:
        if self._state is None:
            raise RuntimeError("Environment state unavailable")
        state = self._state
        if message is not None:
            state.message = message
        description = self._render_state()
        legal_moves = _legal_moves_for_stage(state.stage)
        history_copy = list(state.history)
        return PokerOutcome(
            description=description,
            reward=state.reward,
            done=state.done,
            legal_moves=legal_moves,
            valid=valid,
            stage=state.stage,
            winner=state.winner,
            pot=state.pot,
            history=history_copy,
        )

    def _render_state(self) -> str:
        if self._state is None:
            raise RuntimeError("Environment state unavailable")
        state = self._state
        lines = [
            "Heads-Up Poker Practice",
            f"Stage: {_stage_label(state.stage)}",
            f"Your hand: {_format_cards(state.player_hand)}",
            f"Board: {_format_cards(state.board)}",
            f"Pot: {state.pot} chips",
            f"Legal moves: {', '.join(_legal_moves_for_stage(state.stage)) or 'none'}",
        ]
        if state.message:
            lines.append(f"Feedback: {state.message}")
        return "\n".join(lines)


class HeadsUpPokerAdapter(EnvAdapter):
    """EnvAdapter wrapper for the heads-up poker practice environment."""

    name = "heads_up_poker"

    def __init__(self, seed: int | None = None) -> None:
        self._env = HeadsUpPokerEnv(seed=seed)

    def reset(self) -> Observation:
        state = self._env.reset()
        return Observation(payload={"text": state})

    def execute(self, action: Action) -> StepResult:
        command = self._coerce_command(action)
        outcome = self._env.step(command)
        observation = Observation(payload={"text": outcome.description})
        info = {
            "legal_moves": outcome.legal_moves,
            "valid": outcome.valid,
            "stage": outcome.stage,
            "winner": outcome.winner,
            "pot": outcome.pot,
            "history": outcome.history,
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