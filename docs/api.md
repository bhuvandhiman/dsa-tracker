# HTTP API reference

This documents the current Express API. Exact input validation lives in
[`domain.js`](../apps/api/src/domain.js), route dispatch in
[`app.js`](../apps/api/src/app.js) and [`data-routes.js`](../apps/api/src/data-routes.js),
and database behavior in [`repository.js`](../apps/api/src/repository.js).
Current runtime/security boundaries are described in
[architecture](architecture.md); field meanings are in [data model](data-model.md).

The API is JSON over same-origin `/api` in hosted mode. Local Vite forwards
`/api` to the API server. This is an internal product API, not a versioned
public integration contract; coordinate website and extension releases when
changing request/response shapes.

## Authentication and workspace selection

- In `AUTH_MODE=local`, private data routes use the loopback-only local
  workspace. Account/session endpoints that need hosted accounts report that
  online accounts are not configured.
- In `AUTH_MODE=supabase`, every matched private route requires
  `Authorization: Bearer <Supabase access token>`. The API verifies the token
  with Supabase and then resolves the private workspace from that verified
  user.
- `X-Recall-Workspace` is optional client state protection. When provided, it
  must match the authenticated user ID (or `local` in local mode); it never
  grants access.
- Authenticated/private responses use `Cache-Control: no-store`.
- `/api/health` is public liveness. `/api/ready` is a protected storage
  readiness check and executes a database query.

## Public service and extension-auth routes

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | Process liveness only; does not guarantee the database is ready. |
| `GET /api/auth/config` | Public client configuration: auth mode, configured state, publishable Supabase URL/key when configured, deployment and extension-install settings. Never returns the secret key. |
| `POST /api/auth/extension/login` | Exchange email/password for an extension session in hosted Supabase mode. Passwords are forwarded to Supabase and are not stored by Recall. |
| `POST /api/auth/extension/refresh` | Refresh an extension-owned session for older/direct-login flows. The normal website bridge keeps website refresh ownership on the website. |
| `POST /api/auth/extension/connect` | Verify a short-lived website-issued access token and return a verified extension connection. Does not accept website passwords or refresh tokens. |

## Account and setup routes (hosted mode)

| Method and path | Purpose |
| --- | --- |
| `GET /api/account` | Return current verified account summary and whether deletion is enabled. |
| `GET /api/account/export` | Export account/setup metadata and workspace records in a named account-export envelope; this is not necessarily the same shape as a restorable workspace backup. |
| `DELETE /api/account` | Requires a valid current account password and configured deletion service. Starts durable account/workspace deletion; can return `202` while cleanup is pending. |
| `PUT /api/account/profile` | Update allowlisted account profile fields through Supabase Auth. |
| `GET /api/session` | Return verified user, normalized setup/profile state and owner permissions. |
| `GET /api/setup` | Read onboarding profile, target and completion state. |
| `PUT /api/setup` | Save allowed profile/target/installation acknowledgement/completion fields. Completion requires a configured profile. |

## Workspace and learning-data routes

All routes in this section are mounted beneath `/api` and require the private
workspace boundary above.

### Status, goals, and pattern catalog

| Method and path | Purpose |
| --- | --- |
| `GET /api/ready` | Check workspace storage and return readiness details. |
| `GET /api/retention` | Return categories/subpatterns, coverage, practice-strength evidence, focus, priority details, queue gates, ordering, exclusions and goal summary used by the dashboard. |
| `GET /api/goal` | Read selected profile, target, and policy version. |
| `PUT /api/goal` | Save a supported `profile` and target (`300`, `500`, or `1000`). Changing either resets the derived queue snapshot. |
| `GET /api/patterns` | List persisted patterns. |
| `GET /api/patterns/placements` | List valid primary-placement/retention units. |
| `GET /api/pattern-problems` | Query the problem library by pattern/search/page filters; used by expanded subpattern details. |

### Problems and primary classification

| Method and path | Purpose |
| --- | --- |
| `GET /api/problems` | Read a page of saved problems. |
| `POST /api/problems` | Add or reuse a problem by platform identity. |
| `PUT /api/problems/:id` | Update validated problem metadata. |
| `PUT /api/problems/:id/difficulty` | Correct a problem's difficulty to Easy/Medium/Hard. |
| `PUT /api/problems/:id/patterns` | Update its validated pattern associations. |
| `PUT /api/problems/:id/placement` | Save/clear the manual primary placement override. A non-manual assignment must be a supported candidate; a manual assignment may select a valid catalog unit. |

### Practice capture and history

| Method and path | Purpose |
| --- | --- |
| `POST /api/practice-context` | Receive a problem plus provider topics and return the full selectable unit catalog and inferred current practice unit. Does not itself record practice. |
| `POST /api/capture` | Save a confirmed extension recording transactionally using a stable request UUID; a matching retry returns the existing result. |
| `POST /api/capture/reconcile` | Ask whether a possibly timed-out capture UUID is missing, saved, removed, or conflicts with another payload. |
| `GET /api/attempts` | List/page active recordings with supported filters. |
| `POST /api/attempts` | Create a manually supplied practice attempt through the validated domain input; repeated request identity remains idempotent. |
| `PUT /api/attempts/:id` | Correct an attempt using its revision for optimistic concurrency. |
| `DELETE /api/attempts/:id` | Soft-remove an attempt using its revision. |
| `GET /api/attempts/removed` | Page soft-removed attempts. |
| `POST /api/attempts/:id/restore` | Restore a soft-removed attempt if its revision still matches. |
| `GET /api/problems/:id/history` | Return dated practice/import evidence for one problem, plus candidate classification and undated legacy indicator. |
| `GET /api/history` | Return a page of latest dated solved problems. This endpoint currently backs the History route; it does not invent dates for old imports. |

### Imports, backup, and restore

| Method and path | Purpose |
| --- | --- |
| `GET /api/imports` / `POST /api/imports` | Read import-run state and import legacy accepted problems in bounded, idempotent batches (the exact body controls progress/completion). |
| `GET /api/imports/legacy/:id` / `POST /api/imports/legacy` | Query/resume a durable accepted-problem import run. The POST validates username, run UUID, problem list and completion state. |
| `GET /api/imports/recent/:id` / `POST /api/imports/recent` | Query/import available recent accepted submissions with actual provider dates and unknown assistance. |
| `DELETE /api/imports/:id` | Remove the corresponding imported record/evidence through validated repository rules. |
| `GET /api/workspace/backup` | Create a consistent, bounded restorable workspace backup. |
| `POST /api/workspace/restore` | Validate and restore a backup atomically. The body limit is larger than the general 16 KiB JSON limit and bounded by shared backup limits. |

Import semantics are not interchangeable: legacy accepted problems supply
undated coverage; recent submissions provide only dates LeetCode makes
available. See [legacy import behavior](legacy-import.md) and
[bulk-write design](import-performance.md).

### Diagnostics

| Method and path | Purpose |
| --- | --- |
| `POST /api/diagnostics` | Accept a small, rate-limited client failure summary for owner diagnostics when configured. It does not accept arbitrary stack traces or secrets. |

### Owner-only service routes

All `/api/owner/*` routes require a Supabase-authenticated user with an
explicit owner grant, configured owner storage, MFA proof, and the relevant
permission. Reads are audited. The Chrome extension is explicitly denied.

| Method and path | Permission | Purpose |
| --- | --- | --- |
| `GET /api/owner/overview` | `overview:read` | Aggregate service overview. |
| `GET /api/owner/users` | `users:read` | Paged privacy-limited user directory. |
| `GET /api/owner/users/:id` | `users:read` | One user's service summary, not access to their private problem/attempt data. |
| `POST /api/owner/users/:id/contact` | `contact:read` | Retrieve an explicitly reasoned contact destination. |
| `GET /api/owner/extension` | `diagnostics:read` | Paged sanitized extension diagnostics. |
| `GET /api/owner/health` | `health:read` | Operational health and event-collection status. |
| `GET /api/owner/activity` | `audit:read` | Paged owner audit history. |

See [owner dashboard operations](owner-dashboard.md) for bootstrap, roles,
permissions, MFA, and recovery.

## Errors, limits, and retry expectations

- Validation errors are returned as a JSON `{ "error": "..." }` response with
  an appropriate 4xx status; unexpected storage failures become a generic 5xx
  message while a safe diagnostic code is logged server-side.
- Unknown API paths return JSON 404. The API does not silently route bad API
  paths into the website shell.
- Most JSON requests have a 16 KiB parser limit; restore uses the separate
  compressed/uncompressed backup bound. Import batch sizes and paging limits
  are validated before SQL work.
- Capture and imports must reuse their stable request/run identities after an
  uncertain response. Do not mint a new identity just because the client timed
  out.
- Attempt corrections use a revision. A stale revision returns a conflict so
  the client refreshes instead of silently overwriting newer data.
- The API emits request IDs and measures selected auth/database stages for
  diagnostics. Do not log credentials, database URLs, raw SQL parameters, or
  private notes.

## Versioning and maintenance

There is no external `/v1` prefix. The website and extension ship with this
repository and are tested together. Keep compatibility for frozen extension
drafts and previous import payloads when changing a contract. Update
`data-routes.js`, client callers, fixture integrations, contract tests and this
document in one feature.
