# Architecture

Recall is a single local workspace. React/Vite/Material UI renders major pattern cards, a desktop detail panel, and a mobile drawer. Node/Express serves JSON; PostgreSQL is accessed through pg and parameterized raw SQL. Chrome MV3 captures self-reported practice on LeetCode.

## Data flow

1. A fresh Accepted transition opens the extension prompt. The worker obtains the catalog and suggested approach from POST /api/practice-context.
2. The user supplies assistance and confirms one approach. Optional LeetCode topics are metadata only. The worker persists a frozen payload locally before POST /api/capture.
3. Capture atomically creates or reuses the problem and records an idempotent attempt. Confirmed success closes the prompt; uncertain failures preserve the UUID and payload.
4. GET /api/retention calculates independent subpattern strength. GET /api/pattern-problems and per-problem history supply contextual details and corrections.
5. Extension setup imports all accepted problems, then available recent accepted dates. Settings creates a fresh resumable run for later reimports.

## Storage and boundaries

Problems use unique (platform, external_id) identity. Primary browsing placement, provider topic tags, and attempt practice_unit are separate. Legacy solves establish breadth without inventing practice dates. Imported submissions retain unknown assistance and unique (username, submission_id) identity. Attempts retain assistance, notes, timestamps, original tags, selected topics, capture provenance, and approach provenance. Corrections use optimistic revisions; removal is soft deletion.

Migration 006 adds approach snapshots and the single workspace account binding. Existing migration files are unchanged. Existing installation_id SQL columns now identify import runs; the new wire field is runId, with installationId accepted for older pending payloads.

LeetCode session credentials stay in the browser. Site adapters fail closed on invalid or incomplete data. Live provider markup and endpoint changes may require adapter updates. This app has no multi-user authentication and is intended for localhost use.

There is no recommendation engine, study schedule, standalone library/history screen, priority override control, global progress counter, or dashboard recording form. Older phase documents describe historical implementations only.
