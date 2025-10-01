"""LangChain-based orchestration primitives."""

from __future__ import annotations

import asyncio
import inspect
from contextlib import suppress
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable, Dict, Mapping, MutableMapping, Sequence, Type
from uuid import uuid4

from langchain_core.runnables import RunnableLambda

from agents.base_agent import RuleBasedAgent
from agents.llm_agent import LLMPlanningAgent
from agents.adapters.openai import OpenAIChatAdapter
from agents.adapters.ollama import OllamaAdapter
from agents.adapters.vllm import VLLMAdapter
from bench.adapters.blackjack.adapter import BlackjackAdapter
from bench.adapters.solitaire.adapter import SolitaireAdapter
from bench.core.api import EnvAdapter, PersonaAgent
from bench.core.types import Event, StepResult
from harness.runner import RolloutConfig, RolloutRunner

EvaluationInput = Dict[str, Any]

AdapterType = Type[EnvAdapter]

ADAPTER_REGISTRY: Dict[str, AdapterType] = {
    "solitaire": SolitaireAdapter,
    "blackjack": BlackjackAdapter,
}

LLM_BACKENDS = {"openai_chat", "ollama", "vllm"}


def build_evaluation_chain() -> RunnableLambda:
    """Build a runnable that executes PersonaBench rollouts via the harness."""

    def _run(payload: EvaluationInput) -> Dict[str, Any]:
        trace_events: list[Dict[str, Any]] = []
        result = _execute_evaluation(payload, trace_events.append)
        result.setdefault("trace", trace_events)
        return result

    async def _run_async(payload: EvaluationInput) -> Dict[str, Any]:
        trace_events: list[Dict[str, Any]] = []
        result = await asyncio.to_thread(_execute_evaluation, payload, trace_events.append)
        result.setdefault("trace", trace_events)
        return result

    async def _stream(payload: EvaluationInput):
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
        trace_events: list[Dict[str, Any]] = []

        def _sink(event: Dict[str, Any]) -> None:
            trace_events.append(event)
            loop.call_soon_threadsafe(queue.put_nowait, {"type": "trace", "payload": event})

        async def _runner() -> None:
            result = await asyncio.to_thread(_execute_evaluation, payload, _sink)
            result.setdefault("trace", trace_events)
            await queue.put({"type": "result", "payload": result})

        task = asyncio.create_task(_runner())
        try:
            while True:
                item = await queue.get()
                yield item
                if item["type"] in {"result", "error"}:
                    break
        finally:
            if not task.done():
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task

    runnable = RunnableLambda(_run, afunc=_run_async)
    setattr(runnable, "astream", _stream)
    return runnable


def _execute_evaluation(
    payload: EvaluationInput,
    trace_sink: Callable[[Dict[str, Any]], None] | None = None,
) -> Dict[str, Any]:
    config = _ensure_mapping(payload.get("config", {}), "config")
    run_id = str(config.get("run_id") or payload.get("run_id") or uuid4())

    try:
        persona_data = _ensure_mapping(payload.get("persona"), "persona")
        target = _ensure_mapping(payload.get("target"), "target")
        target_kind = str(payload.get("target_kind", "scenario"))
        target_id = payload.get("target_id")

        adapter_key = _resolve_adapter_key(target, target_kind)
        adapter = _instantiate_adapter(adapter_key, target, config)

        agent = _instantiate_agent(persona_data, config)
        rollout_config = _build_rollout_config(
            config,
            run_id,
            persona_data,
            target_id,
            trace_sink=trace_sink,
        )

        runner = RolloutRunner(agent, adapter, rollout_config)
        steps = runner.run()

        summary = _summarize_steps(steps)

        return {
            "status": "completed",
            "run_id": run_id,
            "persona": persona_data.get("name"),
            "adapter": adapter.name,
            "target_kind": target_kind,
            "target_id": target_id,
            "summary": summary,
            "steps": [_serialize_step(step) for step in steps],
        }
    except Exception as exc:  # pragma: no cover - defensive guard for service stability
        failure = {
            "status": "failed",
            "run_id": run_id,
            "error": str(exc),
            "error_type": exc.__class__.__name__,
        }
        if trace_sink is not None:
            trace_sink(
                {
                    "event": "error",
                    "timestamp": datetime.now(UTC).isoformat(),
                    **failure,
                }
            )
        return failure


def _ensure_mapping(value: Any, label: str) -> MutableMapping[str, Any]:
    if not isinstance(value, MutableMapping):
        raise ValueError(f"Expected '{label}' to be a mapping, received {type(value)!r}")
    return value


def _resolve_adapter_key(target: Mapping[str, Any], target_kind: str) -> str:
    key_field = "environment" if target_kind == "scenario" else "family"
    key = target.get(key_field)
    if not key:
        raise ValueError(f"Target missing '{key_field}' to resolve adapter")
    adapter_key = str(key)
    if adapter_key not in ADAPTER_REGISTRY:
        raise ValueError(f"No adapter registered for '{adapter_key}'")
    return adapter_key


def _instantiate_adapter(
    adapter_key: str,
    target: Mapping[str, Any],
    config: Mapping[str, Any],
) -> EnvAdapter:
    adapter_cls = ADAPTER_REGISTRY[adapter_key]

    adapter_config: Dict[str, Any] = {}
    raw_definition = target.get("raw")
    if isinstance(raw_definition, Mapping):
        if isinstance(raw_definition.get("adapter"), Mapping):
            adapter_config.update(raw_definition["adapter"])  # type: ignore[index]
        elif isinstance(raw_definition.get("config"), Mapping):
            adapter_config.update(raw_definition["config"])  # type: ignore[index]

    if "seed" in config and config["seed"] is not None:
        adapter_config.setdefault("seed", config["seed"])

    if isinstance(config.get("adapter"), Mapping):
        adapter_config.update(config.get("adapter", {}))

    ctor_signature = inspect.signature(adapter_cls)
    ctor_kwargs = {
        name: adapter_config[name]
        for name in adapter_config
        if name in ctor_signature.parameters
    }

    return adapter_cls(**ctor_kwargs)


def _instantiate_agent(persona: Mapping[str, Any], config: Mapping[str, Any]) -> PersonaAgent:
    agent_config = config.get("agent")
    if agent_config is None:
        return RuleBasedAgent(dict(persona))

    if not isinstance(agent_config, Mapping):
        raise ValueError("config.agent must be a mapping when provided")

    agent_type = str(agent_config.get("type") or agent_config.get("kind") or "").strip().lower()
    backend = str(agent_config.get("backend") or "").strip().lower()

    if not agent_type and backend in LLM_BACKENDS:
        agent_type = "llm"

    if agent_type in {"", "rule_based", "baseline"}:
        return RuleBasedAgent(dict(persona))

    if agent_type not in {"llm", "llm_planning"}:
        raise ValueError(f"Unsupported agent type '{agent_type}'")

    if backend not in LLM_BACKENDS:
        raise ValueError(
            f"Unsupported LLM backend '{backend}'. Supported backends: {sorted(LLM_BACKENDS)}"
        )

    planner = _build_llm_planner(backend, agent_config)
    default_command = agent_config.get("default_command", "noop")
    return LLMPlanningAgent(dict(persona), planner, default_command=default_command)


def _build_llm_planner(backend: str, agent_config: Mapping[str, Any]):
    if backend == "openai_chat":
        client = agent_config.get("client")
        if client is None:
            raise ValueError("config.agent.client is required for openai_chat backend")
        model = agent_config.get("model")
        if not model:
            raise ValueError("config.agent.model is required for openai_chat backend")
        system_prompt = str(agent_config.get("system_prompt", ""))
        return OpenAIChatAdapter(client=client, model=str(model), system_prompt=system_prompt)

    if backend == "ollama":
        model = agent_config.get("model")
        if not model:
            raise ValueError("config.agent.model is required for ollama backend")
        host = str(agent_config.get("host", "http://localhost:11434"))
        session = agent_config.get("session")
        timeout_value = _coerce_timeout(agent_config)
        return OllamaAdapter(host=host, model=str(model), session=session, request_timeout=timeout_value)

    if backend == "vllm":
        client = agent_config.get("client")
        if client is None:
            raise ValueError("config.agent.client is required for vllm backend")
        model = agent_config.get("model")
        if not model:
            raise ValueError("config.agent.model is required for vllm backend")
        return VLLMAdapter(client=client, model=str(model))

    raise ValueError(f"Unsupported LLM backend '{backend}'")


def _coerce_timeout(agent_config: Mapping[str, Any]) -> float:
    timeout_value = agent_config.get("request_timeout", agent_config.get("timeout"))
    if timeout_value is None:
        return 30.0
    try:
        return float(timeout_value)
    except (TypeError, ValueError) as exc:
        raise ValueError("config.agent.request_timeout must be numeric") from exc


def _build_rollout_config(
    config: Mapping[str, Any],
    run_id: str,
    persona: Mapping[str, Any],
    target_id: Any,
    *,
    trace_sink: Callable[[Dict[str, Any]], None] | None = None,
) -> RolloutConfig:
    max_steps_value = config.get("max_steps")
    if max_steps_value is None:
        max_steps = RolloutConfig().max_steps
    else:
        try:
            max_steps = int(max_steps_value)
        except (TypeError, ValueError) as exc:
            raise ValueError("config.max_steps must be an integer") from exc

    trace_path_value = config.get("trace_path")
    trace_path = Path(trace_path_value) if trace_path_value else None

    trace_context = config.get("trace_context")
    if trace_context is not None and not isinstance(trace_context, Mapping):
        raise ValueError("config.trace_context must be a mapping if provided")

    persona_id = persona.get("name") if isinstance(persona, Mapping) else None

    return RolloutConfig(
        max_steps=max_steps,
        trace_path=trace_path,
        run_id=run_id,
        persona_id=persona_id,
        scenario_id=str(target_id) if target_id is not None else None,
        trace_context=dict(trace_context) if isinstance(trace_context, Mapping) else None,
        trace_sink=trace_sink,
    )


def _summarize_steps(steps: Sequence[StepResult]) -> Dict[str, Any]:
    total_reward = sum(step.reward for step in steps)
    completed = bool(steps and steps[-1].done)
    return {
        "total_steps": len(steps),
        "total_reward": total_reward,
        "completed": completed,
    }


def _serialize_step(step: StepResult) -> Dict[str, Any]:
    observation = step.observation
    events = (
        _serialize_event(event)
        for event in step.events
    )
    return {
        "observation": {
            "payload": dict(observation.payload),
            "timestamp": observation.timestamp.isoformat(),
        },
        "reward": step.reward,
        "done": step.done,
        "info": dict(step.info),
        "events": list(events),
    }


def _serialize_event(event: Event) -> Dict[str, Any]:
    return {
        "name": event.name,
        "payload": dict(event.payload),
        "timestamp": event.timestamp.isoformat(),
    }

