"""LangChain-based orchestration primitives."""

from __future__ import annotations

from typing import Any, Dict

from langchain_core.runnables import RunnableLambda

EvaluationInput = Dict[str, Any]


def build_evaluation_chain() -> RunnableLambda:
    """Create a minimal evaluation chain placeholder.

    The initial implementation simply echoes the payload alongside a status
    marker. The chain is pluggable so we can extend it with real evaluation
    logic in subsequent iterations without changing the API surface.
    """

    def _run(payload: EvaluationInput) -> Dict[str, Any]:
        return {
            "status": "pending",
            "echo": payload,
        }

    return RunnableLambda(_run)
