"""Reference rollout harness for PersonaBench."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List

from bench.core.api import EnvAdapter, PersonaAgent
from bench.core.logging import TraceLogger
from bench.core.types import StepResult


@dataclass
class RolloutConfig:
    max_steps: int = 100
    trace_path: Path | None = None


class RolloutRunner:
    """Executes PersonaBench rollouts and returns collected step results."""

    def __init__(self, agent: PersonaAgent, adapter: EnvAdapter, config: RolloutConfig | None = None) -> None:
        self._agent = agent
        self._adapter = adapter
        self._config = config or RolloutConfig()
        if self._config.trace_path:
            self._agent._trace_logger = TraceLogger.from_path(self._config.trace_path)

    def run(self) -> List[StepResult]:
        results: List[StepResult] = []
        observation = self._adapter.reset()
        for _ in range(self._config.max_steps):
            result = self._agent.step(observation, self._adapter)
            results.append(result)
            observation = result.observation
            if result.done:
                break
        self._agent._trace_logger.flush()
        self._adapter.close()
        return results
