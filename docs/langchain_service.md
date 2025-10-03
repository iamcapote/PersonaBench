# LangChain Orchestration Service

_Last updated: 2025-10-02_

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

  API --> Queue
  Queue --> LC
  LC --> Harness

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
| `orchestration/chains.py` | LangChain `RunnableLambda` with sync, async, and streaming execution of the rollout harness. | ✅ Implemented (streaming and trace capture wired) |
| `orchestration/routes/` | FastAPI routers for personas, scenarios, games, evaluations, and admin surfaces (queue, audit, feedback). | ✅ Implemented with schema-validated payloads |
| `orchestration/schemas/` | Pydantic models mirroring persona/scenario summaries, queue entries, and evaluation payloads. | ✅ Implemented |
| `orchestration/catalog.py` | Disk-backed loaders + writers for personas, scenarios, and games with deterministic caching. | ✅ Implemented |
| `orchestration/state/` | Lightweight JSONL/JSON persistence for audit trail, evaluation responses, and comparison votes. | ✅ Implemented (next step: swap to durable store) |
| `orchestration/services/` | Background worker job helpers and in-memory event stream powering SSE updates. | ✅ Implemented |
| `orchestration/worker.py` | Singleton evaluation worker consuming queue entries and executing LangChain chains. | ✅ Implemented |
| `orchestration/auth.py` | Header/query admin-key enforcement shared across admin routes. | ✅ Implemented (UI now supplies the key) |
| `orchestration/analytics.py` | Placeholder for future aggregation and reporting jobs. | 🚧 Planned |

## Evaluation Flow

1. **Persona & Scenario Setup**
   - Operators POST persona markdown/JSON to `/api/personas`.
   - Scenarios defined via YAML manifest POST `/api/scenarios`.
   - Service validates against `personas/schema.json` and scenario schema.

2. **Run Submission**
  - Clients POST run manifest to `/api/evaluations` containing persona IDs, scenario IDs, adapter configuration, desired model adapter.
  - API persists a queue entry and enqueues an `EvaluationJobPayload` on the in-process worker so submission latency stays low.

3. **Execution**
  - Worker pulls job, instantiates LangChain chain with persona agent and adapter.
  - Chain executes plan→act→react steps, streaming lifecycle events through the in-memory pub/sub which backs Server-Sent Events.
  - Logs persisted to JSON-backed storage today (durable store still pending).

4. **Result Retrieval**
  - Admin APIs expose evaluation responses, audit events, and queue entries from `orchestration/state/` JSON stores.
  - UI consumes aggregated metrics for comparison dashboards; evaluation queue now supports SSE endpoints for live status updates, which the React queue dashboard listens to for real-time timelines. Operators can now export or copy any run's timeline JSON directly from the dashboard for offline analysis, incident reviews, or quick clipboard sharing, with live event counts, duration badges, auto-scrolling timeline panes, filter toggles (all vs. errors), and a "Jump to latest" control when reviewing historical events.
  - `/api/evaluations/queue/{id}/events/history` provides a durable event log so operators can reconstruct run timelines even after the SSE stream completes.
  - Durable storage migration remains on the roadmap.

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

## Admin Access

Mutating endpoints (`POST`/`PUT`/`PATCH` under `/api` and `/admin`) enforce an operator key sourced from the `PERSONABENCH_ADMIN_KEY` environment variable. Clients include the secret via the `X-Admin-Key` header or `admin_key` query parameter. The React admin console surfaces a key input in the header and automatically attaches the secret to all authorized requests; when omitted, the UI gracefully falls back to local-only behaviour.

## Next Steps

1. Swap the in-process queue for a durable worker tier (Celery, RQ, or Arq) to guarantee delivery and horizontal scale while preserving SSE updates.
2. Replace JSON-backed storage in `orchestration/state/` with a structured database (DuckDB or Postgres) and object storage for trace payloads.
3. Extend streaming beyond the queue: expose SSE or incremental polling endpoints for audit logs and evaluation trace chunks, enabling richer frontend playback.
4. Harden observability: emit OpenTelemetry spans from the LangChain runner and publish structured logs to the existing `TraceLogger` pipeline.
