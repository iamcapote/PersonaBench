# PersonaBench Architecture & Status

_Last updated: 2025-09-30_

## System Surfaces

| Surface | Tech Stack | Current Capability | Notes |
| --- | --- | --- | --- |
| Python backend | `bench/`, `agents/`, `harness/` packages | Implements plan→act→react contract, adapters for supported simulators, evaluation metrics, CLI + match harness | LangChain + FastAPI orchestration service (see [`orchestration/`](../orchestration/)) publishes personas/scenarios/games APIs; shared `GameMaster` orchestrates multi-persona matches |
| React frontend | `src/` (Vite + React + Tailwind) | Persona editor, scenario selector, mock evaluation runner, results gallery | Hydrates personas, scenarios, and games from orchestration service; evaluation wiring still mocked |
| Docs & governance | `README.md`, `PRD.md`, `AGENTS.md`, `completion_plan.md`, `games/games.md`, `dnd.md` | High-level goals, games roadmap, and scenario spec | Tracks split between logic games and emergent D&D-style scenarios |

## Integration Gaps

1. **LangChain orchestration layer**
   - FastAPI + LangChain scaffolding now exposes catalog endpoints and wraps the rollout harness.
   - Required work: route match-based evaluations (via `GameMaster`) through the service, stream trace logs, and harden error handling.
   - Implication: frontend still cannot launch full evaluations until authentication and streaming guards land.

2. **Operator/Admin tooling**
   - Frontend lacks authenticated flows, persona library management, scenario curation, or run scheduling UI.
   - Backend exposes no CRUD APIs for personas/scenarios; everything is file-based. See [`operator_roles.md`](./operator_roles.md) for role definitions and authorization requirements that future endpoints must enforce.

3. **Model comparison surfaces**
   - Metrics exist in Python but there is no aggregation or visualization pipeline for multi-model comparisons.
   - Need consistent schema for storing evaluation runs plus APIs to fetch comparisons for the UI.

4. **User feedback loop**
   - No mechanism to capture human preferences. Desired flow: double-blind A/B where two persona responses are cached and users select a winner.
   - Requires storage (e.g., Postgres, DuckDB, or even local JSONL) and processes for replaying experiments into aggregate metrics.

5. **Scenario expansion & match coverage**
   - Card **games** (solitaire, blackjack, poker) and the new tic-tac-toe engine live under `games/` as logic/game-theory drills; see [`games/games.md`](../games/games.md).
   - **Scenarios** remain the arena for emergent, reactionary evaluation: existing OSWorld/WebArena/Tales manifests plus the D&D benchmark described in [`dnd.md`](../dnd.md).
   - Need to backfill blackjack and poker adapters with `TurnBasedGame` wrappers so they can participate in multi-persona matches, while continuing to author lightweight deterministic engines for future drills.

## Recommended Backend Plan

1. **LangChain service layer**
   - Expose the harness through a REST/gRPC server backed by LangChain `Runnable` graphs.
   - Wrap persona agents as chains that orchestrate plan/act/react steps while emitting structured callbacks.
   - Document authentication, rate limits, and observability expectations.

2. **Evaluation pipeline**
   - Define a run manifest schema (persona IDs, scenario IDs, model adapter config).
   - Persist run metadata + metric outputs in a queryable store.
   - Surface diff-friendly JSON for frontend consumption.

3. **Admin/Operator APIs**
   - CRUD for personas (markdown + compiled JSON), scenarios, evaluation schedules, experiment templates.
   - Hooks for uploading persona bundles, validating against `personas/schema.json`, and promoting to production catalogs.

## Recommended Frontend Plan

1. **Admin Console**
   - Multi-tab UI for persona library, scenario catalog, evaluation queue, human review inbox.
   - Authentication + role-based access (operators vs reviewers).

2. **Model Comparison Dashboard**
   - Heatmaps and radar charts of metric families (strategy, safety, social alignment).
   - Timeline view for regression detection.

3. **Double-Blind Review Workflow**
   - Pull two anonymized persona responses from the feedback queue.
   - Collect reviewer choice + rationale; push results to backend API.
   - Respect reviewer blinding by hiding persona/model identifiers until after submission.

4. **Scenario Authoring UX**
   - Form-driven builder with live schema validation.
   - Templates for card games, negotiations, web tasks.

## Metrics Roadmap

| Metric Bucket | Purpose | Implementation Sketch |
| --- | --- | --- |
| Strategic efficiency | Compare win rates / expected value across game scenarios | Extend `bench/eval` with `expected_value` and `exploitability` metrics |
| Social alignment | Capture cooperation vs defection patterns | Add `cooperation_rate` based on scenario tags |
| Safety & compliance | Track violations, escalation patterns | Expand existing `compliance_rate`; add `red_flag_frequency` |
| Human preference | Measure double-blind A/B outcomes | Store pairwise win counts; compute Bradley-Terry scores |

All new metrics must map to persona/scenario IDs and support aggregation.

## Games vs Scenario Worlds

### Games: Complicated Logic Drills

- Purpose: stress tactical reasoning, probability, and near-term game theory with deterministic rulesets.
- Source of truth: [`games/games.md`](../games/games.md) enumerates classics (Klondike, Spider, FreeCell), math/matching puzzles (Elevens, Monte Carlo), poker-style solitaires, and multiplayer table games (Blackjack, Poker).
- Implementation: adapters under `bench/adapters/` expose pure-Python engines with deterministic seeding and structured telemetry (solve rate, move efficiency, EV deltas, coordination metrics for group modes).

### Scenarios: Complex, Emergent Worlds

- Purpose: evaluate reactionary behaviours—coordination under fog of war, narrative decision-making, resource management—inside rich D&D-style systems.
- Source of truth: [`dnd.md`](../dnd.md) outlines the PersonaBench D&D simulation spec covering character sheets, GM engine, scoring, and governance.
- Implementation: scenario manifests in `scenarios/` pair environment adapters (e.g., Melting Pot, OSWorld) with the new D&D routers to capture emergent interactions. Refer to the [`docs/scenarios/playbooks.md`](./scenarios/playbooks.md) index for detailed episode flows and operator guidance across text-first drills.
- Distinction: games are **complicated** systems (predictable, rule-bound), while scenarios are **complex** systems (multi-layer feedback, emergent outcomes). Metrics must reflect this by combining deterministic leaderboards for games with run-by-run narrative analytics for scenarios.

## Scenario Authoring Improvements

- Provide schema templates per scenario family with required/optional fields.
- Supply validation CLI (`python -m scenarios.validate`).
- Encourage documenting evaluation criteria weights and human review hooks alongside algorithmic metrics.

## Action Items Summary

1. Add LangChain + FastAPI scaffolding and capture controller architecture in this document.
2. Stand up service APIs for personas, scenarios, and evaluation runs.
3. Implement storage + API contracts for human feedback and model comparison data.
4. Wrap blackjack and poker adapters with the `GameMaster`, then scale to additional text-first board/card engines with manifests and deterministic tests.
5. Align frontend roadmap with backend APIs via shared OpenAPI/JSON schema definitions.

Progress on these items should be mirrored in `completion_plan.md` and surfaced via milestone tracking.
