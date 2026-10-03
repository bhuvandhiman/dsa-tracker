# API contracts

All routes use /api, JSON, bounded pagination, and parameterized SQL. Errors return {error}. Missing schema/database returns 503. Incorrect input returns 400, missing records 404, and revision/idempotency conflicts 409.

## Accounts and hosted mode

`AUTH_MODE=supabase` verifies each private request against the configured Auth
project. Account IDs supplied by a browser never select a workspace. Hosted mode
requires an HTTPS origin and verified accounts; local mode remains loopback-only.

- `GET /account`: verified identity and whether deletion is configured.
- `GET /account/export`: version 1 `recall-account-export`, containing account
  details, saved setup and a nested restorable workspace backup from one database
  snapshot. The outer export is not a direct restore payload.
- `DELETE /account`: only `{password,confirmation:"DELETE"}`. Re-authenticate the
  current email and verify the resulting owner matches the request's account.
  Returns 200 `{deleted:true,pending:false}` or 202 `{deleted:false,pending:true}`.
  A queued deletion blocks workspace access and resumes after failures. Server
  secret keys are never included in public configuration or exports.

See [Render deployment](deploy-render.md) and [account setup](account-setup.md).

## Current workflow

- GET /health: liveness only.
- GET /ready: database/schema readiness, bound account, storage description and workspace timezone.
- GET /workspace/backup and POST /workspace/restore: versioned JSON with identical migration checksums. Restore is atomic, adds missing rows, refuses conflicting rows, and preserves exact PostgreSQL timestamps. Restore limit is 20 MB / 200,000 rows; no existing data is overwritten.
- GET /attempts/removed and POST /attempts/:id/restore with {revision}: paginated soft-removal recovery.
- POST /capture/reconcile: capture payload returns saved, missing, removed or conflict without mutating practice.
- PUT /problems/:id/difficulty with {difficulty}: repairs missing provider difficulty.
- GET /retention: asOf, timeZone, ordered categories and children. Each category contains a summary used for its dashboard bar and total distinct-solved count. Children retain independent subpattern evidence. Summary and child strength objects contain assessed, strength (null when no dated evidence exists), displayStrength (always available for the bar), breadth, breadthTarget, reinforcement, recency, weightedRevisits, distinctSolved, lastPracticedAt and a concise reason. Ranking numbers are internal and not displayed. When a goal is configured, the response also contains a separate Goal Coverage summary plus category/subpattern coverage; Practice Strength ordering remains unchanged.
- GET /goal: returns the current Interview Focused or Deep Understanding goal, or the available profiles and 300/500/1000 targets when no goal has been chosen yet.
- PUT /goal: {profile,target}; profile is interview or deep and target is 300, 500 or 1000. Updating this row never rewrites attempts, classifications, notes, assistance or Practice Strength.
- POST /practice-context: {url,title,topics}; returns units and suggested practiceUnit, honoring an existing manual placement.
- GET /pattern-problems?category=slug&limit=10&offset=0: paginated problem details for a category/subpattern. Includes problems whose recorded approach matches even when primary browsing placement differs. Returns {total,problems}.
- GET /problems/:id/history?limit=20&offset=0: {problem,attempts,more,legacy}. Undated legacy evidence is shown after dated history. Imported rows have unknown assistance and inferred approach.
- POST /capture: {requestId,url,title,difficulty,topics,selectedTopics,assistance,attemptedAt,practiceUnit,approachSource,captureSource,submissionId}. difficulty is easy, medium, hard or null. requestId is a v4 UUID; timestamps are UTC ISO strings. Assistance is independent, hint or solution. approachSource is confirmed or inferred; captureSource is accepted or manual; submissionId is optional. Missing new fields on older pending captures use conservative defaults. Returns 201 for a new attempt or 200 for the same frozen retry.
- PUT /attempts/:id: {revision,assistance,patternSlugs,notes,attemptedAt,practiceUnit}. Original topic tags remain separate from the single practiceUnit; the current editor preserves those tags. Editing practiceUnit explicitly confirms it.
- DELETE /attempts/:id: {revision}; soft-deletes mistaken practice.
- PUT /problems/:id/placement: {unit}; null restores automatic browsing classification. Stored attempts are unaffected.

## Import runs

POST /imports/legacy accepts {runId,username,problems,complete}; batches contain at most ten problems. Each problem supplies url, title, difficulty and topics. GET /imports/legacy/:runId reports resumable completion.

POST /imports/recent accepts {runId,username,submissions}; at most twenty available provider submissions, each with submissionId, submittedAt and problem metadata. GET /imports/recent/:runId reports recent-date completion. Provider submission identities deduplicate across runs. The wire alias installationId remains accepted for older pending extension payloads, but new runs use fresh UUIDs.

The workspace account is bound on first verified recording or import. New extension captures include username; different usernames are rejected. Old immutable retries remain compatible. Reimports fill missing difficulty without replacing existing difficulty, assistance, notes, recorded dates, titles or manual classification. Import responses report added, alreadyPresent and excluded Database counts. An accepted-problem import remains committed if fetching recent dates fails.

Scoped lists accept difficulty (easy/medium/hard/unknown), dates (all/dated/undated/older30) and sort (newest/title/oldest-practice/recent-practice), alongside q/status/category. History includes the approach inventory for editing.

Local mode restricts Host to loopback and allows trusted ports 5173, 4173 and
3001, plus Chrome extension origins. Hosted mode accepts the configured HTTPS
site origin/host and extension origins, with a loopback exception for liveness
checks. Hosted private data always requires server-verified Supabase identity;
origin/host checks are an additional boundary, not authentication.

The obsolete /summary, /library and /retention/preferences routes are removed. Existing low-level problem, attempt, pattern and historical-evidence CRUD routes remain available for compatibility and integration fixtures; there is no dashboard form for creating practice.
