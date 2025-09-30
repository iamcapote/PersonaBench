"""Blackjack practice adapter for PersonaBench."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List

from ...core.api import EnvAdapter
from ...core.types import Action, Observation, StepResult


CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10]


@dataclass
class BlackjackState:
    player_hand: List[int]
    dealer_hand: List[int]
    deck: List[int]
    done: bool = False
    outcome: str | None = None


class BlackjackEnv:
    """Minimal blackjack simulator supporting hit/stand decisions."""

    def __init__(self, seed: int | None = None) -> None:
        self._rng = random.Random(seed)
        self._state: BlackjackState | None = None

    def reset(self) -> BlackjackState:
        deck = CARD_VALUES * 4
        self._rng.shuffle(deck)
        player = [deck.pop(), deck.pop()]
        dealer = [deck.pop(), deck.pop()]
        self._state = BlackjackState(player_hand=player, dealer_hand=dealer, deck=deck)
        return self._state

    def step(self, command: str) -> BlackjackState:
        if self._state is None:
            raise RuntimeError("Environment must be reset before stepping")

        state = self._state
        normalized = command.strip().lower()

        if state.done:
            return state

        if normalized not in {"hit", "stand"}:
            state.done = True
            state.outcome = "invalid"
            return state

        if normalized == "hit":
            state.player_hand.append(state.deck.pop())
            if hand_value(state.player_hand) > 21:
                state.done = True
                state.outcome = "bust"
        else:  # stand
            self._resolve_dealer(state)

        return state

    def _resolve_dealer(self, state: BlackjackState) -> None:
        player_total = hand_value(state.player_hand)
        while hand_value(state.dealer_hand) < 17:
            state.dealer_hand.append(state.deck.pop())
        dealer_total = hand_value(state.dealer_hand)
        state.done = True
        if dealer_total > 21 or player_total > dealer_total:
            state.outcome = "win"
        elif player_total == dealer_total:
            state.outcome = "push"
        else:
            state.outcome = "lose"


def hand_value(cards: List[int]) -> int:
    total = sum(cards)
    aces = cards.count(1)
    while aces > 0 and total + 10 <= 21:
        total += 10
        aces -= 1
    return total


class BlackjackAdapter(EnvAdapter):
    """EnvAdapter for single-player blackjack training."""

    name = "blackjack"

    def __init__(self, seed: int | None = None) -> None:
        self._env = BlackjackEnv(seed=seed)

    def reset(self) -> Observation:
        state = self._env.reset()
        return Observation(payload={"text": self._summarize(state, reveal_dealer=False)})

    def execute(self, action: Action) -> StepResult:
        command = self._coerce_command(action)
        state = self._env.step(command)

        description = self._summarize(state, reveal_dealer=state.done)
        info = {
            "legal_moves": self._legal_moves(state),
            "player_total": hand_value(state.player_hand),
            "dealer_upcard": state.dealer_hand[0],
            "outcome": state.outcome,
        }
        reward = self._reward(state)

        return StepResult(
            observation=Observation(payload={"text": description}),
            reward=reward,
            done=state.done,
            info=info,
        )

    @staticmethod
    def _coerce_command(action: Action) -> str:
        if isinstance(action.command, str):
            return action.command
        if action.command is None and "command" in action.arguments:
            return str(action.arguments["command"])
        return str(action.command)

    @staticmethod
    def _legal_moves(state: BlackjackState) -> List[str]:
        if state.done:
            return []
        return ["hit", "stand"]

    @staticmethod
    def _reward(state: BlackjackState) -> float:
        outcome = state.outcome
        if outcome == "win":
            return 1.0
        if outcome == "push":
            return 0.1
        if outcome == "lose":
            return -1.0
        if outcome == "bust":
            return -1.5
        if outcome == "invalid":
            return -2.0
        return 0.0

    @staticmethod
    def _summarize(state: BlackjackState, reveal_dealer: bool) -> str:
        player_cards = ", ".join(_card_label(card) for card in state.player_hand)
        player_total = hand_value(state.player_hand)
        if reveal_dealer:
            dealer_cards = ", ".join(_card_label(card) for card in state.dealer_hand)
            dealer_total = hand_value(state.dealer_hand)
        else:
            dealer_cards = f"{_card_label(state.dealer_hand[0])}, hidden"
            dealer_total = _card_label(state.dealer_hand[0])

        lines = [
            "Blackjack Practice Table",
            f"Player hand: {player_cards} (total {player_total})",
            f"Dealer shows: {dealer_cards}",
            f"Legal moves: {', '.join(BlackjackAdapter._legal_moves(state)) or 'none'}",
        ]
        if state.outcome:
            lines.append(f"Outcome: {state.outcome}")
            if reveal_dealer:
                lines.append(f"Dealer total: {dealer_total}")
        return "\n".join(lines)


def _card_label(card: int) -> str:
    faces = {1: "Ace", 11: "Jack", 12: "Queen", 13: "King"}
    return faces.get(card, str(card))
