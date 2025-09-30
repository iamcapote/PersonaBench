# PersonaBench

PersonaBench unifies plan → act → react evaluation across heterogeneous environments to analyze how AI personas behave under strategic, social, and safety pressure. The repository currently provides:

- A modular Python package (`bench`) defining the common step API, structured traces, and scoring utilities.
- Persona definitions expressed as versioned JSON schemas with examples for cooperative and adversarial archetypes.
- Scenario manifests spanning games (OpenSpiel), social dilemmas (Melting Pot), web/OS automation (WebArena, OSWorld), and language-action worlds (TALES).
- Harness utilities for rolling out agents, capturing JSONL traces, and aggregating persona-aligned metrics.

The design follows recommendations from recent persona-oriented benchmarking proposals, expanding strategic-language benchmarks such as [PokerBench](https://arxiv.org/abs/2501.08328) into a multi-domain persona stress test.

## Repository Layout

```
personabench/
├── bench/                # Core API, logging, adapters, scoring
├── personas/             # Persona schema + example persona definitions
├── scenarios/            # Scenario configuration packs per environment family
├── games/                # Game definitions separated from narrative scenarios
├── agents/               # Agent base classes and model adapters
├── harness/              # Rollout runner and replay tooling
├── leaderboard/          # Submission specs and validators
├── tests/                # Smoke tests for schema + metrics
└── pyproject.toml        # Python packaging configuration
```

## Quick Start

```bash
pip install -e .[dev]
pytest
```

The package installs only light dependencies by default. Individual environment adapters declare optional extras that can be installed when the corresponding simulator is required.

See [`leaderboard/submission_spec.md`](leaderboard/submission_spec.md) for submission packaging rules and [`bench/core/api.py`](bench/core/api.py) for the persona-aware step interface.

## Current Status Overview

- **Backend (Python package)**: Provides the core step-loop API, adapters, and metric primitives. A new FastAPI orchestration service backed by LangChain now exposes `/api/personas`, `/api/scenarios`, `/api/games`, and `/api/evaluations`, while adapters remain lightweight Python shims executed through the `bench/` and `harness/` modules.
- **Frontend (React app)**: Lives under `src/`. The UI now hydrates personas and scenarios from the orchestration service (with local fallbacks) but still operates as a prototype without operator/admin consoles or remote scheduling controls.
- **Build + Tests**: `pytest` covers schema validation, metric utilities, and a simple agent smoke test. Frontend code has no automated test coverage.

### Games vs. Scenarios

- **Games** live under `games/` and target tightly-scoped logical drills: solitaire variants, blackjack, poker, and other probability puzzles. They stress mathematical reasoning and near-term game theory under deterministic rules. The roadmap in [`games/games.md`](games/games.md) captures the rollout of single-persona drills and multi-agent table games.
- **Scenarios** live under `scenarios/` and (for new work) the D&D benchmark specification in [`dnd.md`](dnd.md). These reactionary evaluations emphasise emergent behavior—party coordination, narrative decision-making, and long-horizon adaptability inside complex worlds.

Refer to [`docs/architecture.md`](docs/architecture.md) for a deeper dive into the intended integration between these surfaces and the outstanding work required to bridge them, and [`docs/evaluation_design.md`](docs/evaluation_design.md) for the evaluation/feedback roadmap.

## Near-Term Priorities

1. **Backend orchestration**: Implement a LangChain-powered service that wraps the harness, providing tool routing, scenario coordination, and APIs the frontend can call.
2. **Operator experience**: Design and implement admin surfaces for persona management, scenario curation, and evaluation scheduling. Document workflow expectations so UI and backend efforts stay aligned.
3. **Evaluation UX**: Add persona comparison dashboards, model-to-model benchmarks, and user-feedback loops (including double-blind A/B captures) that feed back into scoring pipelines.
4. **Scenario library expansion**: Formalize lightweight, text-first games (solitaire variants, blackjack, poker-style multi-agent matchups) that can run fully in Python without external simulators.

Alignment between these streams is tracked in the architecture notes and the living completion plan (`completion_plan.md`).
