"""Structured trace logging for PersonaBench runs."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import IO, Any, Dict

from .types import Action, PersonaSignature, Plan, Reaction, StepResult


class TraceLogger:
    """Writes persona traces to JSONL for auditability."""

    def __init__(self, sink: IO[str]) -> None:
        self._sink = sink

    def log_plan(self, agent: str, plan: Plan) -> None:
        self._write({"event": "plan", "agent": agent, "payload": asdict(plan)})

    def log_action(self, agent: str, action: Action) -> None:
        self._write({"event": "action", "agent": agent, "payload": asdict(action)})

    def log_step_result(self, agent: str, result: StepResult) -> None:
        payload: Dict[str, Any] = {
            "observation": asdict(result.observation),
            "reward": result.reward,
            "done": result.done,
            "info": dict(result.info),
            "events": [asdict(event) for event in result.events],
        }
        self._write({"event": "step_result", "agent": agent, "payload": payload})

    def log_reaction(self, agent: str, reaction: Reaction) -> None:
        self._write({"event": "reaction", "agent": agent, "payload": asdict(reaction)})

    def log_signature(self, agent: str, signature: PersonaSignature) -> None:
        self._write({"event": "persona_signature", "agent": agent, "payload": asdict(signature)})

    def flush(self) -> None:
        self._sink.flush()

    def _write(self, payload: Dict[str, Any]) -> None:
        self._sink.write(json.dumps(payload) + "\n")

    @classmethod
    def from_path(cls, path: Path) -> "TraceLogger":
        sink = path.open("a", encoding="utf-8")
        return cls(sink)

    @classmethod
    def null_logger(cls) -> "TraceLogger":
        return cls(_NullSink())


class _NullSink:
    def write(self, _: str) -> None:  # pragma: no cover - trivial
        return None

    def flush(self) -> None:  # pragma: no cover - trivial
        return None


__all__ = ["TraceLogger"]
