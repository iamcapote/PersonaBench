# Operator & Reviewer Roles

_Last updated: 2025-09-30_

## Purpose

Define the personas responsible for running PersonaBench evaluations and the authorization guarantees required to keep the system safe, auditable, and repeatable.

## Role Overview

### Operator

- **Primary responsibilities**
  - Curate persona and scenario catalogs and promote vetted revisions to production.
  - Schedule evaluation runs, including selecting persona, scenario/game, and runtime configuration.
  - Monitor active runs and restart or cancel when necessary.
- **Required capabilities**
  - Read/write access to persona JSON bundles and scenario manifests.
  - Ability to invoke `/api/evaluations` and view trace logs, budgets, and metrics.
  - Manage run configurations (model adapters, seeds, episode counts).
- **Safeguards**
  - Changes must be versioned; operators cannot delete historical records.
  - Every mutation must emit an audit log entry (who, when, before/after).

### Reviewer

- **Primary responsibilities**
  - Participate in double-blind comparison flows and record human preference votes.
  - Review safety flags and escalate runs that violate policy.
  - Contribute qualitative annotations to augment automated metrics.
- **Required capabilities**
  - Read-only access to evaluation metadata and cached persona outputs.
  - Submit feedback through `/api/feedback` endpoints without seeing persona identifiers until after voting.
  - Access reviewer UI inbox and history of previously submitted judgments.
- **Safeguards**
  - Feedback submissions are immutable; edits require operator intervention.
  - Rate limiting ensures one submission at a time per reviewer session to preserve blinding.

### Admin (optional escalation)

While not part of the initial plan, designate an administrator role to manage authentication sources, rotate API keys, and configure storage backends. Admins can delegate operator and reviewer access.

## Authorization Requirements

| Capability | Operator | Reviewer | Admin |
| --- | --- | --- | --- |
| Manage personas (`POST/PUT/PATCH /api/personas`) | ✅ | ❌ | ✅ |
| Manage scenarios (`POST/PUT/PATCH /api/scenarios`) | ✅ | ❌ | ✅ |
| Trigger evaluations (`POST /api/evaluations`) | ✅ | ❌ | ✅ |
| View evaluations (`GET /api/evaluations/:id`, logs) | ✅ | ✅ | ✅ |
| Submit feedback (`POST /api/feedback`) | ❌ | ✅ | ✅ |
| Manage reviewers (`POST /api/reviewers`) | ❌ | ❌ | ✅ |
| Configure storage/providers | ❌ | ❌ | ✅ |

## Authentication Model

1. **Identity provider**: leverage the existing org SSO or short-lived API tokens scoped per role.
2. **Session storage**: use signed JWTs that encode the role and allowed scopes; refresh tokens limited to admins.
3. **Role-based access control (RBAC)**: service middleware maps incoming tokens to the role matrix above. Requests lacking the necessary scope are denied with `403` responses.
4. **Audit logging**: every privileged endpoint records operator ID, payload hash, outcome, and latency for compliance reporting.

## Implementation Notes

- Extend the FastAPI application with dependency-injected `CurrentUser` objects that declare available scopes.
- Keep authorization logic centralized (e.g., `orchestration.auth` module) so the same policies apply to REST and LangChain callbacks.
- UI should request only the scopes it needs; review flows never load persona identifiers until the verdict is persisted.
- Store all role assignments in configuration that supports code review (e.g., YAML manifest in infrastructure repo) to avoid drift.

## Next Steps

1. Add authentication dependencies (e.g., `fastapi[security]`, `pyjwt`) and enforce bearer-token validation in the orchestration service.
2. Wire operator CRUD endpoints to signed commits of persona/scenario bundles; reviewers only receive anonymized evaluation snapshots.
3. Integrate audit logs with the existing `TraceLogger` payloads so operational and strategic events share the same timeline.
