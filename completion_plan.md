# Completion Plan

## Purpose
This plan outlines actionable next steps for developing and improving PersonaBench, ensuring alignment with the repository's purpose and current implementation.

## Immediate Priorities

### 1. Orchestration & Service Layer (LangChain)
- **Objective**: Expose the existing harness through a LangChain-powered service interface that the frontend (and external clients) can call.
- **Tasks**:
  - [x] Add LangChain + FastAPI dependencies to the Python package (update `pyproject.toml`).
  - [x] Implement LangChain `Runnable` wrappers around persona agents and environment adapters (see `orchestration/chains.py`).
  - [x] Scaffold `/api/personas`, `/api/scenarios`, `/api/evaluations` endpoints that invoke LangChain chains.
  - [x] Extend evaluation chain with async execution, trace streaming, and richer harness wiring.
  - [x] Create comprehensive LangChain migration guide with architecture, patterns, and examples (see `docs/langchain_migration_guide.md` and `docs/langchain_examples.md`).

### 2. Admin & Operator Experience
- **Objective**: Deliver authenticated UI and APIs for managing personas, scenarios, and evaluation runs.
- **Tasks**:
  - [x] Implement persona/scenario CRUD endpoints with schema validation and versioning metadata (see FastAPI routes in `orchestration/routes.py` and catalog helpers in `orchestration/catalog.py`, covered by `tests/test_orchestration_crud.py`).
  - [x] Update the React app with admin tabs for library, queue, and audit logs; migrate persistence from client-only storage to service calls.
    - Admin key provider now lives in the header, stores the secret locally, and injects `X-Admin-Key` into all authorized fetches.
    - Mutating actions surface clear errors when the key is missing and fall back to local placeholders.
  - [x] Document workflow roles (operator, reviewer) and authorization requirements (see `docs/operator_roles.md`).
  - [x] Design a streamlined builder that relies on explicit controls (add, duplicate, move up/down) so operators can create and save personas, scenarios, and rule variants with inline JSON/YAML previews—no drag-and-drop required.
  - [x] Enable simple reordering for scenario setup steps, constraints, and evaluation criteria while keeping JSON/YAML previews in sync, with both keyboard move buttons and optional drag handles plus optimistic save feedback.
  - [x] Add optimistic UI states, toast feedback, and bulk import/export tooling now that remote persistence is enabled.
  - [x] Surface game manifests, rule packs, and adapter code snippets directly in the UI so users can inspect mechanics before running evaluations.
  - [x] Add guided transparency tooling (side-by-side code + UI) so every change to games or personas can be traced back to source files.
    - Persona/Game transparency panels now render source paths and raw definitions (`PersonaTransparencyPanel`, `ScenarioTransparencyPanel`, `GameTransparencyPanel`).
    - React app wires inspect actions back to orchestration metadata.

### 3. Frontend Comparison & Utility UI Refresh
- **Objective**: Replace the prototype UI with a clarity-first, operator-focused experience inspired by modern model leaderboards, analytics hubs, and tabletop dashboards provided in the design references.
- **Guiding Principles**:
  - Prioritize comprehension over chrome: every screen should explain what the user is looking at, why it matters, and what to do next.
  - Treat comparisons as first-class: side-by-side evaluation, pricing, and performance views must sit one click away from any persona or run.
  - Borrow proven layouts: combine dense summary headers (leaderboards), multi-panel comparisons (llmarena, Adaptive Reasoning chart), and modular stat cards (DnD dashboards) to keep information scannable.
- **Tasks**:
  1. **Information Architecture Overhaul**
    - [x] Consolidate navigation into "Runs", "Compare", "Personas", and "Scenarios" hubs.
    - [x] Introduce a persistent context rail with the active persona, scenario, and evaluation status so users never lose track of scope.
    - Split setup versus analysis flows: wizard-style creation (left rail) and dashboard-style review (full-width, card-based).
  2. **Comparison Workspace**
    - [x] Build a sticky comparison header showing aggregate intelligence, cost, latency, and risk in a matrix similar to the llmarena comparison sheet.
    - Provide toggleable visualizations: bar/box charts for score distributions (echoing the DnD stats box plot) and heatmaps for volatility and cooperation metrics.
    - Support flexible cohort selection with chips + filters for provider, modality, context window, and budget.
      - [x] Add evaluation mode and scenario difficulty cohort chips that drive analytics filtering (`ComparisonCohortFilters`).
      - [ ] Extend cohort filters to provider, modality, context window, and budget segments.
    - [x] Replace the `ResultsAnalytics` head-to-head tab with a live persona comparison matrix (win-rate + score edge) derived from shared scenarios.
  3. **Persona & Scenario Detail Modules**
    - Design card templates mirroring the Notion-style persona sheets: key stats on the left, expandable tabs for memory/tools/logs on the right.
    - Embed rule previews and adapter snippets inline with tabs instead of separate pages to reduce navigation churn.
  4. **Run Playback & Transparency Tools**
    - Add timeline components with collapsible steps (plan → act → react) and quick diff links back to source files.
    - Surface trace logs in a side drawer with filters for tool calls, budget events, and anomalies.
  5. **Design System Definition**
    - Establish tokens for typography, spacing, and color that match the updated brand direction (dark-on-slate with accent blues/greens derived from the reference dashboards).
    - Standardize card, table, and chart patterns; document usage in Storybook before wiring to live data.
  6. **Implementation Roadmap**
    - Phase 1: Wireframe + Storybook for base components (comparison table, stat cards, persona drawer).
    - Phase 2: Integrate with existing FastAPI endpoints, replacing mock data incrementally.
    - Phase 3: Usability validation with operators; bake findings into polish sprint (empty states, loading skeletons, accessibility).

### 4. Double-Blind Feedback Pipeline
- **Objective**: Capture human preference data by presenting cached persona responses side-by-side.
- **Tasks**:
  - [x] Persist evaluation responses in a queryable store (initial JSON-backed persistence with admin APIs for review).
  - [x] Build pairing logic + APIs for retrieving anonymized `A/B` comparisons.
  - Create reviewer UI flow, storage for votes, and Bradley–Terry aggregation job.
    - [x] Persist reviewer votes with admin APIs (state helpers, validation, testing).
    - [x] Deliver reviewer-facing UI for collecting preferences (compare workspace card, reviewer inputs, submission plumbing).
  - [x] Implement Bradley–Terry aggregation job and reporting endpoints.

### 5. Model Comparison Analytics
- **Objective**: Provide meaningful persona + adapter comparisons across new metric families.
- **Tasks**:
  - Extend `bench/eval/metrics.py` with expected value, cooperation rate, red flag rate, and volatility penalties.
   - [x] Extend `bench/eval/metrics.py` with expected value, cooperation rate, red flag rate, and volatility penalties.
  - Persist metrics in structured tables and expose comparison endpoints.
  - Enhance frontend dashboards with heatmaps/radar charts and regression alerts.

### 6. Text-Based Scenario Suite
- **Objective**: Introduce lightweight card/negotiation games that run entirely in Python.
- **Tasks**:
  - [x] Implement solitaire and heads-up poker adapters under `bench/adapters/` with deterministic seeds (see `bench/adapters/solitaire/adapter.py` and `bench/adapters/poker/adapter.py`).
  - [x] Add manifests under `scenarios/` and corresponding tests (`games/poker/practice.yaml`, `tests/test_heads_up_poker_adapter.py`).
  - [x] Document scenario playbooks in `docs/scenarios/` (see updated poker section in `docs/scenarios/playbooks.md`).

### 7. Enhance Logging and Observability
- **Objective**: Improve `TraceLogger` and surrounding tooling to support service deployment.
- **Tasks**:
  - Add run IDs, persona/scenario metadata, and tool usage summaries to logs.
  - Emit structured events suitable for both local debugging and centralized logging.
  - Write tests to validate logging behavior end-to-end.
   - [x] Add run IDs, persona/scenario metadata, and tool usage summaries to logs.
   - [x] Emit structured events suitable for both local debugging and centralized logging.
   - [x] Write tests to validate logging behavior end-to-end.

### 8. Game Master Engine & Multi-Persona Play
- **Objective**: Provide a reusable orchestration layer so multiple persona agents can compete within real game engines.
- **Tasks**:
  - [x] Introduce the core `GameMaster` with `TurnBasedGame` interface and `MatchRunner` harness to coordinate turn-by-turn agent play.
  - [x] Implement a production-grade `TicTacToeGame` engine that enforces legal moves, scoring, and structured events.
  - [x] Add tic-tac-toe match configs plus automated tests covering invalid moves and full-game completion.
  - [x] Integrate existing blackjack/poker adapters with the game master for true multi-persona play.

## Latest Progress (2025-10-02)
- Polished the persona workspace with optimistic save indicators, toast-driven feedback, and inline spinners while persisting edits through the service catalog.
- Added one-click persona import/export controls (with admin key gating) to streamline bulk catalog updates alongside JSON bundle parsing + download helpers shared with the library dashboard.
- Introduced an in-process evaluation worker plus SSE queue endpoints so runs execute asynchronously with live status streaming while we plan the jump to durable infrastructure.
- Added admin key controls to the React header, centralising secret storage and automatically attaching `X-Admin-Key` to persona, scenario, queue, audit, and feedback mutations.
- Routed all frontend data loaders through the shared admin client, short-circuiting admin endpoints when the key is absent and improving toast feedback for operators.
- Simplified the scenario builder to rely on explicit add/duplicate/move controls, removed drag-and-drop affordances, and added one-click duplication for setup steps, constraints, and evaluation criteria to speed up authoring while staying accessible.
- Reorganized the operator navigation into Runs, Compare, Personas, and Scenarios hubs, folding queue, audit, library, and analytics surfaces into the new layout for faster context switching.
- Added a persistent context rail that surfaces the active scenario, selected personas, queue status, and quick navigation links so operators keep their bearings between workflows.
- Introduced a sticky comparison summary header that rolls up evaluation volume, scoring averages, persona/scenario coverage, and telemetry placeholders for cost and latency to anchor the analytics workspace.
- Added cohort filter chips for evaluation mode and scenario difficulty, wiring them into the analytics pipeline so summary metrics, leaderboards, and comparisons respect the selected slice while keeping persona/scenario filters in sync.
- Refreshed docs (`README.md`, `docs/architecture.md`, `docs/langchain_service.md`, `completion_plan.md`) to reflect the new workflow and clarify the remaining workstreams.
- Enriched the evaluation queue with persisted summary metrics, exposed them via both admin and public APIs, and refreshed the queue dashboards to surface backlog pressure and recent run telemetry.
- Added automatic queue polling with manual refresh controls and last-sync/error indicators on the operator dashboards, backed by new API regression tests covering public and admin queue endpoints.
- Extended the queue dashboard with per-run event timelines powered by the new history endpoint so operators can audit lifecycle transitions without leaving the UI.
- Wired the queue timeline to the SSE endpoint so live events stream directly into the React dashboard, with resilience for interruptions and a clear "Live/Paused" status indicator.
- Enabled one-click export of run event timelines from the queue dashboard so operators can archive JSON logs for investigations and share live playback snapshots.
- Added clipboard copy controls next to the export action so operators can grab timeline JSON instantly when triaging incidents or sharing quick updates.
- Surfaced per-run event counts alongside the streaming badge so operators immediately see how rich a timeline is before drilling into details.
- Introduced timeline duration badges derived from event timestamps so operators can estimate run length without opening the full detail view.
- Wrapped the run timeline in an auto-scrolling pane so live updates stay visible while still allowing manual review via a capped scroll area.
- Added a "Jump to latest" control that appears when operators scroll back in history, making it easy to resume live updates after incident review.
- Added timeline filter toggles (All vs. Errors) plus inline error counts so operators can zero in on failure states without losing access to the full history.
- Added persona card duplication controls so operators can spin up variants with a prefilled editor while keeping the creation flow button-driven.

### Previous Checkpoint (2025-10-01)
- Completed the double-blind reviewer workspace in the React app, enabling scenario filtering, reviewer metadata capture, and preference submission wired to comparison vote APIs.
- Added navigation hooks and transparency panels so reviewers can jump between comparisons and underlying persona/scenario definitions.
- Ran `npm run lint` (TypeScript `tsc --noEmit`) to validate the new UI and resolved a `Select` prop regression introduced by the disabled state.

### Paused Track: Async Worker & Streaming Wiring
- **Backend status**: Evaluations now enqueue onto an in-process background worker that pushes lifecycle events to SSE streams while persisting responses to JSON stores.
- **Outstanding work**: We still need a durable queue/worker for horizontal scale, streaming of full trace payloads, and an archival store beyond JSON files.
- **Resume checklist**:
  1. Swap the in-process worker for a durable queue (Celery, RQ, or Arq) with retry semantics.
  2. Extend streaming beyond status events—deliver trace chunks and audit updates so the frontend can render live playback.
  3. Replace JSON persistence in `orchestration/state/` with DuckDB/Postgres + object storage for trace payloads, including migrations.
  4. Smoke-test the durable worker + streaming integration with `pytest` and UI linting to ensure SSE consumers remain stable.

### Follow-Up Opportunities
- Add optimistic loading states and error toasts for vote submission failures once backend retries are defined.
- Extend the reviewer dashboard with aggregation summaries from the Bradley–Terry job to close the loop between vote collection and analytics.
- Evaluate end-to-end API tests that exercise the reviewer flow via Playwright or Vitest + MSW before cutting a release.

## Current State of the App
- 📝 Schema validation: Working
- 🧪 Test framework: Working
- 💾 Memory system: Not implemented (scenarios inherently need a form of memory).
- 🔧 Tool management: Partially implemented
- 📊 Metrics: Basic implementation
- 🌐 Service layer: Not implemented (frontend is standalone prototype)
- 🧑‍🔬 Human feedback: Not implemented (requires double-blind pipeline)
 - 🌐 Service layer: Available via FastAPI + LangChain (background workers and streaming pending)
 - 🧑‍🔬 Human feedback: UI + APIs implemented; aggregation/reporting jobs still outstanding

## Long-Term Goals

### 1. Scenario Builder
- **Objective**: Develop a UI or CLI tool for creating and managing scenarios.
- **Tasks**:
  - Define scenario templates for common use cases.
  - Implement validation for scenario configuration files.

### 2. Results Analytics Dashboard
- **Objective**: Build a dashboard for visualizing evaluation results.
- **Tasks**:
  - Integrate with existing logging and metrics.
  - Provide comparative analysis tools for personas.

## Development Workflow
1. **Branching**: Create feature branches for each task.
2. **Testing**: Write unit and integration tests for all new code.
3. **Code Review**: Ensure all changes are reviewed and approved.
4. **Documentation**: Update `README.md` and other relevant documentation.

## Success Metrics
- All tests pass with 100% coverage for new code.
- Tool usage limits are enforced without errors.
- Logs capture complete and accurate data.
- Adapters handle failure scenarios gracefully.

---
This plan will be updated as development progresses.