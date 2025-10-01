# LLM Agent Configuration

_Last updated: 2025-09-30_

This guide explains how to enable large language model (LLM) backed planning inside PersonaBench’s orchestration service. It complements the philosophical overview in `AGENTS.md` by documenting the concrete configuration surface exposed through LangChain and the harness.

## Overview

PersonaBench now supports plugging LLM planners into the evaluation runtime. Evaluations opt in per-run by supplying an `agent` block inside the evaluation `config`. When omitted, the deterministic `RuleBasedAgent` continues to drive plan→act→react loops.

```json
{
  "persona": { "name": "Strategist", ... },
  "target": { "environment": "solitaire", ... },
  "config": {
    "max_steps": 2,
    "agent": {
      "type": "llm",
      "backend": "openai_chat",
      "client": "<OpenAI client instance>",
      "model": "gpt-4o-mini",
      "system_prompt": "You are a solitaire coach",
      "default_command": "draw"
    }
  }
}
```

> ⚠️ **Runtime objects**: JSON serializers cannot encode Python clients. When submitting evaluations through the API you must register the client inside the service (for example via dependency injection) and reference it by handle. The JSON example above highlights the required fields only.

> 🛠️ **Tool-calling alignment**: LLM planners can be paired with Model Context Protocol (MCP) tools or HTTP utilities exposed by the orchestration layer. When an adapter advertises tool metadata in `config.agent.tools`, the planner is asked to output JSON-compatible commands (`{"tool": "http.get", "args": {...}}`) so downstream tool routers can execute requests and return results in the observation payload. Output parsers—including the default step normaliser—unwrap these commands before invoking environment adapters, keeping persona-facing prompts simple while preserving structured tool usage.

## Supported Backends

| Backend        | Identifier      | Required Parameters                           | Notes |
| -------------- | ----------------| ---------------------------------------------- | ----- |
| OpenAI Chat    | `openai_chat`   | `client`, `model`                              | Uses chat completion API; optional `system_prompt` sets persona framing. |
| Ollama         | `ollama`        | `model`                                       | Optional `host`, `request_timeout`, and `session` (preconfigured `requests.Session`). |
| vLLM HTTP      | `vllm`          | `client`, `model`                              | `client` must expose `.post(path, json=..., timeout=...)`. |

Backends are selected through `config.agent.backend`. The orchestrator normalizes the `type` field (`llm`, `llm_planning`) and defaults to `llm` when `backend` is recognized.

## Planner Behaviour

All LLM planners operate through `agents.llm_agent.LLMPlanningAgent`:

- Delegates `plan` to the configured adapter’s `generate_plan(persona, observation)` method.
- Normalizes numbered or bulleted steps into lower-case commands.
- Issues `Action(command=str)` from the first non-empty step, falling back to `default_command` when the plan is empty.
- Leaves `react` as a no-op; adapters may be extended later to support richer reactions.

## Configuration Reference

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `config.agent.type` | string | optional | Accepts `llm`, `llm_planning`, `rule_based`, `baseline`. Inferred as `llm` when omitted and `backend` is provided. |
| `config.agent.backend` | string | yes\* | Must be one of `openai_chat`, `ollama`, `vllm`. Required when `type` resolves to `llm`. |
| `config.agent.model` | string | yes | Provider-specific model identifier. |
| `config.agent.client` | object | depends | Required for `openai_chat` and `vllm`. Must already be instantiated and reachable from orchestration runtime. |
| `config.agent.host` | string | optional | Base URL for Ollama (defaults to `http://localhost:11434`). |
| `config.agent.request_timeout` | number | optional | Overrides per-request timeout (seconds). Accepts float or int. |
| `config.agent.session` | object | optional | Custom HTTP session passed to Ollama adapter. |
| `config.agent.system_prompt` | string | optional | Additional grounding for OpenAI-style chat models. |
| `config.agent.default_command` | string | optional | Fallback action if the LLM omits actionable steps (defaults to `noop`). |

## Error Handling

- Missing or malformed `config.agent` raises `ValueError` before invoking the adapter, preventing silent fallbacks.
- Unsupported backends result in a descriptive error listing available identifiers.
- Timeout values are coerced to floats; incompatible types raise `ValueError`.
- If the LLM returns blank content, the agent issues the configured `default_command` so the rollout continues predictably.

## Testing & Validation

- `tests/test_llm_adapters.py` covers the individual adapter wrappers.
- `tests/test_evaluation_chain.py::test_evaluation_chain_with_llm_agent` validates the LangChain runnable wiring with a fake OpenAI client.

Continually expand these suites when adding new backends or modifying planner behaviour.
