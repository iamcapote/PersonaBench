# Completion Plan

## Purpose
This plan outlines actionable next steps for developing and improving PersonaBench, ensuring alignment with the repository's purpose and current implementation.

## Immediate Priorities

### 1. Orchestration & Service Layer (LangChain)
- **Objective**: Expose the existing harness through a LangChain-powered service interface that the frontend (and external clients) can call.
- **Tasks**:
  - Add LangChain + FastAPI dependencies to the Python package (update `pyproject.toml`).
  - Implement LangChain `Runnable` wrappers around persona agents and environment adapters.
  - Scaffold `/api/personas`, `/api/scenarios`, `/api/evaluations` endpoints that invoke LangChain chains and stream trace logs.

### 2. Admin & Operator Experience
- **Objective**: Deliver authenticated UI and APIs for managing personas, scenarios, and evaluation runs.
- **Tasks**:
  - Implement persona/scenario CRUD endpoints with schema validation and versioning metadata.
  - Update the React app with admin tabs for library, queue, and audit logs; migrate persistence from client-only storage to service calls.
  - Document workflow roles (operator, reviewer) and authorization requirements.

### 3. Double-Blind Feedback Pipeline
- **Objective**: Capture human preference data by presenting cached persona responses side-by-side.
- **Tasks**:
  - Persist evaluation responses in a queryable store (e.g., Postgres, DuckDB, s3-backed JSONL).
  - Build pairing logic + APIs for retrieving anonymized `A/B` comparisons.
  - Create reviewer UI flow, storage for votes, and Bradley–Terry aggregation job.

### 4. Model Comparison Analytics
- **Objective**: Provide meaningful persona + adapter comparisons across new metric families.
- **Tasks**:
  - Extend `bench/eval/metrics.py` with expected value, cooperation rate, red flag rate, and volatility penalties.
  - Persist metrics in structured tables and expose comparison endpoints.
  - Enhance frontend dashboards with heatmaps/radar charts and regression alerts.

### 5. Text-Based Scenario Suite
- **Objective**: Introduce lightweight card/negotiation games that run entirely in Python.
- **Tasks**:
  - Implement solitaire and heads-up poker adapters under `bench/adapters/` with deterministic seeds.
  - Add manifests under `scenarios/` and corresponding tests.
  - Document scenario playbooks in `docs/scenarios/`.

### 6. Enhance Logging and Observability
- **Objective**: Improve `TraceLogger` and surrounding tooling to support service deployment.
- **Tasks**:
  - Add run IDs, persona/scenario metadata, and tool usage summaries to logs.
  - Emit structured events suitable for both local debugging and centralized logging.
  - Write tests to validate logging behavior end-to-end.

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