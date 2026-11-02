# Architecture

This is the current runtime map. Product motivation and decisions are in
[product brief](product-brief.md); data semantics are in
[domain model](data-model.md); every source file is indexed in
[codebase map](codebase-map.md).

## Runtime shape

Recall is one JavaScript npm-workspaces repository with three application areas:

```text
Chrome on LeetCode  <---->  Recall MV3 extension
                                  |
                                  | JSON API; hosted mode also gets a short-lived
                                  | website-issued Supabase access token
                                  v
                          Express API + PostgreSQL
                           /              \
                local Vite website     hosted static React build
```

- `apps/web` is a React 19 client built with Vite. Hash routes support website
  navigation and preserve Supabase email confirmation/recovery callbacks.
- `apps/api` is an Express 5 JSON API and the persistence boundary. SQL is
  parameterized and sent through `pg`; the database stores domain data and
  per-workspace state.
- `apps/extension` is a Chrome Manifest V3 extension with content scripts,
  background service worker, popup/settings pages, and import/capture flows.
- `apps/shared` contains small shared limits and design/profile definitions.

In local development, `scripts/dev.js` starts the API on `127.0.0.1:3001` and
Vite on `127.0.0.1:5173`. Vite forwards `/api` calls to the API. The extension
source defaults to localhost. In hosted mode, the API serves the built website
and API from the same Render origin. `scripts/package-extension.js` produces a
ZIP whose exact host permissions and runtime URLs target that origin.

## Local and hosted modes

### Local mode

- `DEPLOYMENT_MODE=local`, `AUTH_MODE=local`.
- Requires PostgreSQL for practice data. There is no implicit in-memory
  practice store.
- The API binds to loopback only and uses the local schema.
- Local mode intentionally keeps the original single-workspace development
  behavior, useful for testing and for keeping local data separate from hosted
  accounts.

### Hosted mode

- `DEPLOYMENT_MODE=hosted`, `AUTH_MODE=supabase`, configured Supabase project,
  PostgreSQL session-pooler `DATABASE_URL`, and an HTTPS application origin.
- Every private API request is verified against Supabase Auth. The API derives
  the workspace from the verified user; a client-supplied workspace ID cannot
  select another account.
- `user-workspaces.js` maps a verified Supabase UUID to an isolated PostgreSQL
  schema and runs the schema migrations the first time that workspace is used.
  A pool checkout sets the workspace search path and resets it before reuse.
- The server serves Vite's production build from `apps/web/dist` and serves
  `/api` from the same host. Render's `/api/health` is a liveness check, not a
  database-readiness check.
- `SUPABASE_SECRET_KEY` is server-side only. It enables deletion of the Auth
  identity; it is never placed in frontend assets or the extension.
- `render.yaml` deliberately has `autoDeployTrigger: "off"`. A new Git commit
  does not deploy itself.

See [account setup](account-setup.md) and the [deployment runbook](deploy-render.md)
for exact environment variables and operational steps.

## Request and data flows

### Sign-in and workspace access

1. The website's `auth-client.js` uses Supabase email/password Auth and its
   PKCE-based browser session. Google sign-in was deferred by decision.
2. The website calls the API with its access token. The API verifies the token
   against Supabase before opening the account's workspace.
3. On the configured Recall origin, the website and extension perform a
   nonce-checked `postMessage` handshake. The website sends only its short-lived
   access token. The extension sends that token to its worker, which verifies
   the identity through the API. Website sign-out disconnects the extension;
   the website remains the single refresh-token owner.
4. `X-Recall-Workspace` is a mismatch guard, not authority. The server compares
   it with the authenticated identity and rejects stale account state.

The extension's LeetCode session is separate. LeetCode credentials remain in
the browser profile and are used for reading the signed-in user's accepted
problems and available recent accepted submissions. Recall does not request a
LeetCode password.

### Record a practice attempt

1. The LeetCode content scripts detect a fresh Accepted transition and read
   problem metadata plus provider topics. They do not collect solution source.
2. The compact Recall panel asks how the learner solved it and requires the
   learner to confirm topics used. The `Other` route opens a searchable pattern
   chooser for problems whose provider topics are missing or insufficient.
3. Before sending, the extension stores a frozen request payload and UUID. It
   retries that same payload/UUID if the response may have been lost, so a
   retry cannot manufacture another attempt. The date is internal evidence;
   the UI does not show a browser-clock field for the learner to edit.
4. The API validates input, checks identity, classifies the problem and chosen
   topics, and saves the problem plus attempt transactionally. The persistence
   layer deduplicates by the attempt UUID/request hash and does not overwrite
   established titles, user notes, manual placement, or earlier evidence.
5. On confirmed success, the extension sends a change notification to an open
   Recall page so the dashboard can refresh.

See [extension recording](extension-recording.md) and the
[domain model](data-model.md) for field meanings.

### Import accepted problems

1. The extension validates the current LeetCode account and reads its accepted
   problem list from the signed-in browser session.
2. A persistent import run freezes the input list and checkpoint. Duplicate
   problem identities are folded before each bulk SQL upsert; imported topics
   and candidate pattern associations are written in bounded batches.
3. Checkpoints advance only after the server acknowledges a batch. Safe retries
   reuse the same run and are idempotent. Pause/resume, conflict locks and
   recovery live in the extension worker/controller rather than a component
   staying open forever.
4. After the accepted list, Recall requests up to twenty available recent
   accepted submissions to establish dates. LeetCode does not provide a
   complete historical timeline here. If recent retrieval fails, the accepted
   problem import remains valid and those solves remain undated.
5. Historical accepts are coverage evidence, not fabricated attempts. They do
   not claim unknown assistance or independent recall.

See [import behavior](legacy-import.md), [classification rules](import-classification.md),
and [measured import optimization](import-performance.md).

### Dashboard and ranking

1. The website requests `/api/retention`; the API reads the goal, problem
   catalog, classified solve identities, recorded attempts, and available
   imported submission dates.
2. The retention policy computes current practice-strength signals per
   subpattern and category. The goal policy independently computes profile and
   difficulty-balanced coverage allocations.
3. The queue combines unfilled goal coverage with committed practice weakness.
   A persisted queue snapshot prevents every single solve from shuffling the
   recommendation order. The queue snapshot is derived state and can be rebuilt
   from the retained history and current policy.
4. The dashboard combines the strongest signals: one large overall dated
   practice-strength display, pattern recommendations, and Easy/Medium/Hard
   goal coverage. The Patterns page makes ranking and subpattern details
   inspectable. The UI labels goals and strength as such rather than as a
   proven probability of future success.

Exact equations, weights, holds and gate release rules are documented in
[retention policy](retention.md); quota allocation and evidence boundaries are
in [goal policy evidence](goal-policy-evidence.md).

## Persistence boundaries

- The stable problem key is `(platform, external_id)`. LeetCode URLs are parsed
  only from the expected HTTPS host and `/problems/<slug>` path.
- A problem has one effective primary browse placement. Provider topics,
  problem-pattern candidate associations, a manual placement override, and the
  pattern practiced for an attempt are separate fields/concepts.
- Attempt IDs are UUIDs. Attempts preserve assistance, notes, date, practice
  unit, selected topics, provenance, revision number, and soft deletion state.
- Imported recent submissions use provider submission IDs plus dates and
  unknown assistance; they do not overwrite actual attempts.
- Goal and queue configuration are per workspace. A queue snapshot never
  replaces the underlying evidence.
- Backup/export and restore stay inside the authenticated workspace. Account
  deletion blocks new access while cleanup runs and retries failed cleanup.

SQL migrations are ordered and applied once per schema. **Do not edit an
already-applied migration to change behavior**; add a new migration and test
both a fresh schema and an upgrade path. The newest schema migration currently
is `011_queue_snapshot.sql`.

## Security and failure behavior

- Hosted API requests are authenticated server-side; user IDs from browser
  payloads never choose a private schema.
- The extension website bridge checks same-origin source, nonce, top frame,
  extension identity, owner, and token validity. It never copies passwords or
  website refresh tokens into the content script.
- Extension import/capture writes persist a stable operation identity before
  network work. Retrying a timeout is safer than changing the payload.
- Database diagnostics log safe failure codes, not connection strings,
  passwords, tokens, SQL values, or account identifiers.
- Hosted responses use no-store for private/authenticated data and add security
  headers. Local mode is loopback-only.
- Errors are returned as actionable JSON; the website has an `ErrorBoundary`,
  auth recovery states, and a small HTML startup fallback in case the client
  JavaScript fails before React mounts.

Review [privacy and data controls](../apps/web/src/Privacy.jsx),
[account lifecycle](../apps/api/src/account-lifecycle.js), and
[owner operations](owner-dashboard.md) before changing these boundaries.

## Deliberate scope boundaries

Recall currently recommends **what pattern deserves attention**, not a
calendar appointment or a scientifically calibrated memory probability. It
does not run a daily check-in, infer independent ability from Accepted alone,
or infer a missing historical date. A specific interface route may diverge from
the decisions; see [product decisions](product-decisions.md) for known mismatches.
