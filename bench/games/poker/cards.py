"""Utility helpers for heads-up poker engines and adapters."""

from __future__ import annotations

from itertools import combinations
from typing import Iterable, List, Sequence, Tuple

RANKS: List[str] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
SUITS: List[str] = ["♠", "♥", "♦", "♣"]
RANK_VALUES = {rank: index + 2 for index, rank in enumerate(RANKS)}

Card = Tuple[str, str]


def build_deck() -> List[Card]:
    """Return a shuffled deck template (ordering handled by caller)."""

    return [(rank, suit) for rank in RANKS for suit in SUITS]


def card_label(card: Card) -> str:
    return f"{card[0]}{card[1]}"


def format_cards(cards: Iterable[Card]) -> str:
    rendered = ", ".join(card_label(card) for card in cards)
    return rendered or "—"


def legal_moves_for_stage(stage: str, *, awaiting_call: bool = False) -> List[str]:
    if stage in {"showdown", "finished"}:
        return []
    if awaiting_call:
        return ["call", "fold"]
    return ["check", "bet", "fold"]


def stage_label(stage: str) -> str:
    labels = {
        "preflop": "Pre-flop",
        "flop": "Flop",
        "turn": "Turn",
        "river": "River",
        "showdown": "Showdown",
        "finished": "Hand Complete",
    }
    return labels.get(stage, stage.title())


def hand_rank(hand: Sequence[Card]) -> Tuple[int, Tuple[int, ...]]:
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


def best_hand_rank(cards: Sequence[Card]) -> Tuple[int, Tuple[int, ...]]:
    best_rank: Tuple[int, Tuple[int, ...]] | None = None
    for combo in combinations(cards, 5):
        rank = hand_rank(combo)
        if best_rank is None or rank > best_rank:
            best_rank = rank
    assert best_rank is not None
    return best_rank


__all__ = [
    "Card",
    "RANKS",
    "SUITS",
    "RANK_VALUES",
    "build_deck",
    "card_label",
    "format_cards",
    "legal_moves_for_stage",
    "stage_label",
    "hand_rank",
    "best_hand_rank",
]
