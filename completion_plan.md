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
  - Update the React app with admin tabs for library, queue, and audit logs; migrate persistence from client-only storage to service calls.
  - [x] Document workflow roles (operator, reviewer) and authorization requirements (see `docs/operator_roles.md`).
  - Design a drag-and-drop (DnD) builder that lets operators create and save personas, scenarios, and rule variants with inline previews of the underlying JSON/YAML.
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
    - Consolidate navigation into "Runs", "Compare", "Personas", and "Scenarios" hubs.
    - Introduce a persistent context rail with the active persona, scenario, and evaluation status so users never lose track of scope.
    - Split setup versus analysis flows: wizard-style creation (left rail) and dashboard-style review (full-width, card-based).
  2. **Comparison Workspace**
    - Build a sticky comparison header showing aggregate intelligence, cost, latency, and risk in a matrix similar to the llmarena comparison sheet.
    - Provide toggleable visualizations: bar/box charts for score distributions (echoing the DnD stats box plot) and heatmaps for volatility and cooperation metrics.
    - Support flexible cohort selection with chips + filters for provider, modality, context window, and budget.
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
  - Integrate existing blackjack/poker adapters with the game master for true multi-persona play.

## Latest Progress (2025-10-01)
- Completed the double-blind reviewer workspace in the React app, enabling scenario filtering, reviewer metadata capture, and preference submission wired to comparison vote APIs.
- Added navigation hooks and transparency panels so reviewers can jump between comparisons and underlying persona/scenario definitions.
- Ran `npm run lint` (TypeScript `tsc --noEmit`) to validate the new UI and resolved a `Select` prop regression introduced by the disabled state.

### Paused Track: Admin Auth & Frontend Wiring
- **Backend status**: FastAPI admin, queue, audit, and persona/scenario mutation routes now respect an env-driven `PERSONABENCH_ADMIN_KEY`. Tests inject a deterministic key through `tests/conftest.py` and update headers accordingly.
- **Outstanding work**: The React prototype still issues unauthenticated requests; we need a lightweight admin key capture (client-side storage, attach header/query) plus error handling for `403` responses.
- **Resume checklist**:
  1. Add a global admin key provider in the frontend (context + secure input) and plumb it into `fetch` helpers touching `/admin/*`, `/api/personas`, and `/api/scenarios` mutations.
  2. Document operator setup flow (set env var, copy key into UI) and ensure the orchestration service tolerates missing keys by responding with `403` rather than `401`.
  3. Re-run full backend + frontend test suites (`pytest`, `npm run lint`) once the UI wiring lands.
  4. Consider a future secret rotation story (key reload without restart) before shipping beyond internal environments.

Leave this section intact until the UI work merges so future contributors can resume without spelunking commit history.

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