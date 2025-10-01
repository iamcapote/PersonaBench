"""Structured trace logging for PersonaBench runs."""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import IO, Any, Callable, Dict, Mapping


class TraceJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles datetime objects."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

from .types import Action, PersonaSignature, Plan, Reaction, StepResult



class TraceLogger:
    """Writes persona traces to JSONL for auditability, with run context and tool usage summaries."""

    def __init__(
        self,
        sink: IO[str],
        *,
        run_id: str | None = None,
        persona: str | None = None,
        scenario: str | None = None,
        extra_context: Dict[str, Any] | None = None,
        event_sink: Callable[[Dict[str, Any]], None] | None = None,
    ) -> None:
        self._sink = sink
        base_context = {
            "run_id": run_id,
            "persona": persona,
            "scenario": scenario,
        }
        self._context = {key: value for key, value in base_context.items() if value is not None}
        if extra_context:
            for key, value in extra_context.items():
                if value is not None:
                    self._context[key] = value
        self._tool_usage: Dict[str, int] = {}
        self._event_sink = event_sink

    def log_context(self) -> None:
        payload = {
            "event": "context",
            "timestamp": datetime.now(UTC).isoformat(),
            **self._context,
        }
        self._write(payload)

    def log_plan(self, agent: str, plan: Plan) -> None:
        self._write(
            {
                "event": "plan",
                "agent": agent,
                "timestamp": datetime.now(UTC).isoformat(),
                "payload": asdict(plan),
                **self._context,
            }
        )

    def log_action(self, agent: str, action: Action) -> None:
        # Track tool usage for summary
        for call in getattr(action, "tool_calls", []):
            if isinstance(call, Mapping):
                name = call.get("name")
            else:
                name = getattr(call, "name", None)
            if name:
                self._tool_usage[name] = self._tool_usage.get(name, 0) + 1

        self._write(
            {
                "event": "action",
                "agent": agent,
                "timestamp": datetime.now(UTC).isoformat(),
                "payload": asdict(action),
                **self._context,
            }
        )

    def log_step_result(self, agent: str, result: StepResult) -> None:
        payload: Dict[str, Any] = {
            "observation": asdict(result.observation),
            "reward": result.reward,
            "done": result.done,
            "info": dict(result.info),
            "events": [asdict(event) for event in result.events],
        }
        self._write(
            {
                "event": "step_result",
                "agent": agent,
                "timestamp": datetime.now(UTC).isoformat(),
                "payload": payload,
                **self._context,
            }
        )

    def log_reaction(self, agent: str, reaction: Reaction) -> None:
        self._write(
            {
                "event": "reaction",
                "agent": agent,
                "timestamp": datetime.now(UTC).isoformat(),
                "payload": asdict(reaction),
                **self._context,
            }
        )

    def log_signature(self, agent: str, signature: PersonaSignature) -> None:
        self._write(
            {
                "event": "persona_signature",
                "agent": agent,
                "timestamp": datetime.now(UTC).isoformat(),
                "payload": asdict(signature),
                **self._context,
            }
        )

    def log_tool_summary(self) -> None:
        payload = {
            "event": "tool_summary",
            "timestamp": datetime.now(UTC).isoformat(),
            **self._context,
            "tool_usage": dict(self._tool_usage),
        }
        self._write(payload)

    def flush(self) -> None:
        self._sink.flush()

    def _write(self, payload: Dict[str, Any]) -> None:
        if self._event_sink is not None:
            self._event_sink(dict(payload))
        self._sink.write(json.dumps(payload, cls=TraceJSONEncoder) + "\n")

    @classmethod
    def from_path(cls, path: Path, **kwargs) -> "TraceLogger":
        sink = path.open("a", encoding="utf-8")
        return cls(sink, **kwargs)

    @classmethod
    def null_logger(cls, **kwargs) -> "TraceLogger":
        return cls(_NullSink(), **kwargs)


class _NullSink:
    def write(self, _: str) -> None:  # pragma: no cover - trivial
        return None

    def flush(self) -> None:  # pragma: no cover - trivial
        return None


__all__ = ["TraceLogger"]
