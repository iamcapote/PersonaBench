"""Shared blackjack helpers for adapters and game engines."""

from __future__ import annotations

from typing import Iterable, List

CARD_VALUES: List[int] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10]


def create_deck() -> List[int]:
    """Return a fresh four-suit blackjack deck."""

    return CARD_VALUES * 4


def hand_value(cards: Iterable[int]) -> int:
    """Compute the best blackjack value for the supplied card sequence."""

    total = sum(cards)
    aces = sum(1 for card in cards if card == 1)
    while aces > 0 and total + 10 <= 21:
        total += 10
        aces -= 1
    return total


def card_label(card: int) -> str:
    """Return a human-readable label for a card value."""

    faces = {1: "Ace", 10: "10"}
    return faces.get(card, str(card))


__all__ = ["CARD_VALUES", "create_deck", "hand_value", "card_label"]
