"""Prototype solitaire adapter to validate PersonaBench text-game interactions."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List

from ...core.api import EnvAdapter
from ...core.types import Action, Observation, StepResult


@dataclass
class TurnOutcome:
    """Container for solitaire environment step results."""

    description: str
    reward: float
    done: bool
    legal_moves: List[str]
    valid: bool


class SimpleSolitaireEnv:
    """Minimal single-suit solitaire environment.

    The environment is intentionally lightweight: it models a stock pile, waste pile,
    and a single foundation stack that must be built from Ace (1) through King (13).
    Persona agents interact with the environment through natural-language commands
    such as ``"draw"`` or ``"play"``.
    """

    def __init__(self, seed: int | None = None) -> None:
        self._rng = random.Random(seed)
        self._stock: List[int] = []
        self._waste: List[int] = []
        self._foundation: int = 0

    def reset(self) -> str:
        self._stock = list(range(1, 14))
        self._rng.shuffle(self._stock)
        self._waste = []
        self._foundation = 0
        return self._summarize()

    def step(self, command: str) -> TurnOutcome:
        normalized = command.strip().lower()
        reward = 0.0
        valid = True
        message: str = ""

        if normalized in {"draw", "d", "deal"}:
            if self._stock:
                card = self._stock.pop()
                self._waste.append(card)
                reward = 0.1
                message = f"Drew a {self._card_label(card)} from the stock."
            else:
                valid = False
                reward = -0.5
                message = "No cards remain in the stock."
        elif normalized in {"play", "move", "play waste"}:
            if not self._waste:
                valid = False
                reward = -0.5
                message = "The waste pile is empty. Draw before playing."
            else:
                card = self._waste[-1]
                required = self._foundation + 1
                if card == required:
                    self._foundation = card
                    self._waste.pop()
                    reward = 1.0
                    message = f"Placed {self._card_label(card)} onto the foundation."
                else:
                    valid = False
                    reward = -0.2
                    message = (
                        f"Cannot place {self._card_label(card)}. "
                        f"Need {self._card_label(required)} instead."
                    )
        else:
            valid = False
            reward = -0.3
            message = (
                "Unrecognised command. Use 'draw' to reveal a card or 'play' "
                "to move the waste card onto the foundation."
            )

        done = self._foundation == 13 or (not self._stock and not self._waste)
        description = self._summarize(message)
        legal_moves = self._legal_moves()
        return TurnOutcome(description, reward, done, legal_moves, valid)

    def _legal_moves(self) -> List[str]:
        moves: List[str] = []
        if self._stock:
            moves.append("draw")
        if self._waste and self._waste[-1] == self._foundation + 1:
            moves.append("play")
        return moves

    def _summarize(self, message: str | None = None) -> str:
        foundation = (
            self._card_label(self._foundation) if self._foundation else "empty foundation"
        )
        waste = self._card_label(self._waste[-1]) if self._waste else "empty waste"
        summary_lines = [
            "Simple Solitaire",
            f"Foundation: {foundation}",
            f"Waste top: {waste}",
            f"Stock remaining: {len(self._stock)} cards",
            f"Legal moves: {', '.join(self._legal_moves()) or 'none'}",
        ]
        if message:
            summary_lines.append(f"Feedback: {message}")
        return "\n".join(summary_lines)

    @staticmethod
    def _card_label(card: int) -> str:
        faces = {
            1: "Ace",
            11: "Jack",
            12: "Queen",
            13: "King",
        }
        return faces.get(card, str(card))


class SolitaireAdapter(EnvAdapter):
    """EnvAdapter implementation for the prototype solitaire environment."""

    name = "solitaire"

    def __init__(self, seed: int | None = None) -> None:
        self._env = SimpleSolitaireEnv(seed=seed)

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
