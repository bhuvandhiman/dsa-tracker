# API contracts

All routes use /api, JSON, bounded pagination, and parameterized SQL. Errors return {error}. Missing schema/database returns 503. Incorrect input returns 400, missing records 404, and revision/idempotency conflicts 409.

## Current workflow

- GET /health: liveness only.
- GET /retention: asOf, timeZone, ordered categories and children. Each category contains a summary used for its dashboard bar and total distinct-solved count. Children retain independent subpattern evidence. Summary and child strength objects contain assessed, strength (null when no dated evidence exists), displayStrength (always available for the bar), breadth, breadthTarget, reinforcement, recency, weightedRevisits, distinctSolved, lastPracticedAt and a concise reason. Ranking numbers are internal and not displayed.
- POST /practice-context: {url,title,topics}; returns units and suggested practiceUnit, honoring an existing manual placement.
- GET /pattern-problems?category=slug&limit=10&offset=0: paginated problem details for a category/subpattern. Includes problems whose recorded approach matches even when primary browsing placement differs. Returns {total,problems}.
- GET /problems/:id/history?limit=20&offset=0: {problem,attempts,more,legacy}. Undated legacy evidence is shown after dated history. Imported rows have unknown assistance and inferred approach.
- POST /capture: {requestId,url,title,topics,selectedTopics,assistance,attemptedAt,practiceUnit,approachSource,captureSource,submissionId}. requestId is a v4 UUID; timestamps are UTC ISO strings. Assistance is independent, hint or solution. approachSource is confirmed or inferred; captureSource is accepted or manual; submissionId is optional. Missing new fields on older pending captures use conservative defaults. Returns 201 for a new attempt or 200 for the same frozen retry.
- PUT /attempts/:id: {revision,assistance,patternSlugs,notes,attemptedAt,practiceUnit}. Original topic tags remain separate from the single practiceUnit; the current editor preserves those tags. Editing practiceUnit explicitly confirms it.
- DELETE /attempts/:id: {revision}; soft-deletes mistaken practice.
- PUT /problems/:id/placement: {unit}; null restores automatic browsing classification. Stored attempts are unaffected.

## Import runs

POST /imports/legacy accepts {runId,username,problems,complete}; batches contain at most ten problems. Each problem supplies url, title, difficulty and topics. GET /imports/legacy/:runId reports resumable completion.

POST /imports/recent accepts {runId,username,submissions}; at most twenty available provider submissions, each with submissionId, submittedAt and problem metadata. GET /imports/recent/:runId reports recent-date completion. Provider submission identities deduplicate across runs. The wire alias installationId remains accepted for older pending extension payloads, but new runs use fresh UUIDs.

The workspace account is bound on first import. A different username is rejected. Reimport never replaces existing assistance, notes, recorded dates, titles or manual classification. An accepted-problem import remains committed if fetching recent dates fails.

The obsolete /summary, /library and /retention/preferences routes are removed. Existing low-level problem, attempt, pattern and historical-evidence CRUD routes remain available for compatibility and integration fixtures; there is no dashboard form for creating practice.
