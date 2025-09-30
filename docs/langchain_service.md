# LangChain Orchestration Service

_Last updated: 2025-09-29_

## Goals

1. Provide a stateless API wrapper around PersonaBench's plan→act→react harness using LangChain primitives.
2. Support synchronous and asynchronous evaluation runs with structured logging and trace export.
3. Offer operator/admin capabilities (persona/scenario CRUD, run scheduling, feedback pairing) behind authenticated endpoints.

## High-Level Architecture

```mermaid
graph TD
  subgraph Client Surfaces
    UI[React Admin UI]
    CLI[CLI / Automation]
  end

  UI -->|HTTPS| API
  CLI -->|HTTPS| API

  subgraph Service Layer
    API[FastAPI Router]
    LC[LangChain Controller]
    Queue[Run Queue (RQ/Celery)]
  end

  API --> LC
  LC --> Queue
  Queue --> Harness

  subgraph Backend Systems
    Harness[PersonaBench Harness]
    Store[(Postgres / DuckDB)]
    Blob[(Object Storage)]
  end

  Harness --> Store
  Harness --> Blob
  API --> Store
  API --> Blob
```

## Modules

| Module | Responsibility | Status |
| --- | --- | --- |
| `orchestration/chains.py` | Define LangChain `Runnable` graphs for plan→act→react loops, exposing callbacks for logging and metric extraction. | TODO |
| `orchestration/apis.py` | FastAPI routers for personas, scenarios, evaluations, feedback. | TODO |
| `orchestration/models.py` | Pydantic models mirroring schema JSON (personas, scenarios, run manifests). | TODO |
| `orchestration/storage.py` | Abstractions over Postgres/DuckDB + object storage for traces and cached responses. | TODO |
| `orchestration/auth.py` | API key or OAuth-based auth + role enforcement. | TODO |

## Evaluation Flow

1. **Persona & Scenario Setup**
   - Operators POST persona markdown/JSON to `/api/personas`.
   - Scenarios defined via YAML manifest POST `/api/scenarios`.
   - Service validates against `personas/schema.json` and scenario schema.

2. **Run Submission**
   - Clients POST run manifest to `/api/evaluations` containing persona IDs, scenario IDs, adapter configuration, desired model adapter.
   - API stores manifest, enqueues job, returns run ID.

3. **Execution**
   - Worker pulls job, instantiates LangChain chain with persona agent and adapter.
   - Chain executes plan→act→react steps, streaming events via callbacks.
   - Logs persisted to blob storage (JSONL) and summary metrics to database.

4. **Result Retrieval**
   - Clients GET `/api/evaluations/{id}` to inspect status, metrics, trace URLs.
   - UI consumes aggregated metrics for comparison dashboards.

## Double-Blind Feedback Integration

- During run execution, persona responses stored with content hash and anonymized IDs.
- `/api/feedback/pairs` selects two responses (matching scenario+prompt) and returns redacted payloads.
- Reviewers POST votes to `/api/feedback/votes`; aggregation job updates Bradley–Terry scores.

## Deployment Considerations

- Target container base: Python 3.11 slim + UV.
- Use Gunicorn/Uvicorn to serve FastAPI.
- Background workers via Celery (Redis broker) or RQ.
- Config via environment variables; avoid hardcoding secrets.
- Observability: OpenTelemetry tracing, structured logs (`TraceLogger`) forwarded to log aggregation.

## Next Steps

1. Add LangChain + FastAPI, Pydantic, Celery dependencies to `pyproject.toml` extras.
2. Scaffold package `orchestration/` with modules above and unit tests.
3. Define OpenAPI schema (FastAPI auto-docs) and share with frontend team.
4. Implement minimal happy-path evaluation chain (single persona + scenario) and integration tests.
5. Iterate on admin UI to consume new APIs and retire `useKV` storage.
