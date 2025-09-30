"""Reference rollout harness for PersonaBench."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

from bench.core.api import EnvAdapter, PersonaAgent
from bench.core.logging import TraceLogger
from bench.core.types import StepResult


@dataclass
class RolloutConfig:
    max_steps: int = 100
    trace_path: Path | None = None
    run_id: str | None = None
    persona_id: str | None = None
    scenario_id: str | None = None
    trace_context: Dict[str, Any] | None = None


class RolloutRunner:
    """Executes PersonaBench rollouts and returns collected step results."""

    def __init__(self, agent: PersonaAgent, adapter: EnvAdapter, config: RolloutConfig | None = None) -> None:
        self._agent = agent
        self._adapter = adapter
        self._config = config or RolloutConfig()
        if self._config.trace_path:
            self._agent._trace_logger = TraceLogger.from_path(
                self._config.trace_path,
                run_id=self._config.run_id,
                persona=self._config.persona_id or getattr(agent, "name", None),
                scenario=self._config.scenario_id,
                extra_context=self._config.trace_context,
            )
            self._agent._trace_logger.log_context()

    def run(self) -> List[StepResult]:
        results: List[StepResult] = []
        observation = self._adapter.reset()
        try:
            for _ in range(self._config.max_steps):
                result = self._agent.step(observation, self._adapter)
                results.append(result)
                observation = result.observation
                if result.done:
                    break
        finally:
            trace_logger = getattr(self._agent, "_trace_logger", None)
            if trace_logger is not None:
                trace_logger.log_tool_summary()
                trace_logger.flush()
            self._adapter.close()
        return results
