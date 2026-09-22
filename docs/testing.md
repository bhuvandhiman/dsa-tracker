# Testing

## Phase 4 verification

`npm.cmd run check` runs linting, 86 database-independent tests, and a production dashboard build. These passed after the Phase 4 changes. No new test dependencies were added.

Phase 4 adds mocked Chrome API checks for fixed-destination handoff, changed SPA problems, navigation away, malformed identities, creation-error recovery, and rapid-click suppression. Dashboard tests cover metadata-only prefill and invalid launch links.

Browser verification used the actual API and an isolated PostgreSQL schema. Opening a handoff link filled URL/title but left assistance and patterns unselected, with zero stored attempts. After a deliberately interrupted save, a different incoming problem link preserved the original pending attempt. Retry left exactly one attempt, removed the launch parameter, and a reload showed a blank form. Actual unpacked Chrome loading remains a manual step in phase-4.md.

The default suite covers:

- Health availability without PostgreSQL, explicit 503 setup responses, malformed/oversized JSON, unsupported encodings, and concurrent requests.
- Domain validation: canonical LeetCode identities, assistance values, explicit practiced patterns, timestamps, note bounds, UUIDs, historical imports, and pagination.
- Data-route HTTP behavior with injected repository doubles: validation before writes, creation/retry statuses, conflict/not-found errors, and database failure responses. These tests do not execute SQL.
- Web health-client validation, HTTP/network failures, and cancellation.
- Practice form validation, UTC conversion, pending-save restoration, and stable request IDs through uncertain retries.
- Extension manifest scope, URL parsing, SPA navigation, messages, popup retries and malformed responses.
- Real API process startup/shutdown, invalid/occupied ports, Vite proxy behavior, unavailable PostgreSQL probe behavior, and combined-startup cleanup.

## PostgreSQL integration suite

Run `npm.cmd run test:db` after PostgreSQL is installed and DATABASE_URL is configured in apps/api/.env. TEST_DATABASE_URL can select a separate test database.

The suite creates an isolated random schema, applies the actual SQL migration twice, and verifies:

- Seed patterns and unique problem identities.
- Possible versus practiced pattern separation.
- Stored notes with SQL-like text.
- Identical/concurrent retries creating only one attempt and conflicting retries returning 409.
- Validation failures rolling back without partial data.
- Catalog pattern edits preserving past attempt approaches.
- Historical import deduplication and atomic failure, with no invented attempts.
- Data surviving connection closure/reopening.
- Applied migration checksum mismatch detection.

Cleanup drops only the generated test schema. Existing application tables are untouched. The test requires CREATE permission on the configured database.

**Verified against the running PostgreSQL database.** `db:check` passed, `db:migrate` confirmed that the application schema is up to date, and `test:db` passed all assertions in the integration suite above. The running API also returned phase 2 health and all 15 seeded patterns through `/api/patterns`. The integration suite used its isolated schema and cleaned it up afterward. Default tests remain database-independent; rerun `test:db` explicitly after database-layer changes.

## Browser and installation evidence

During Phase 1, a clean npm ci installation passed checks. The dashboard was manually checked for a healthy API, HTTP 503, five-second timeout, null response, retry recovery, and 320/390-pixel layouts without horizontal overflow. The heading structure was corrected. Phase 3 replaces the connection shell with the practice journal. Its production build and PostgreSQL integration suite passed.

Phase 3 browser checks used the real API/repository and migrations in an isolated PostgreSQL schema: new problem and attempt creation, persistence after reload, literal rendering of script-like notes, existing problem selection without inherited patterns, and a deliberately dropped response after commit. Reloading and retrying the pending save left exactly two attempts instead of inserting a duplicate. Pagination showed 20 then 3 records after seeding 21 additional fixtures. API failure retained previously loaded history with an error; an initial failure disabled new saves. A 320-pixel viewport had no horizontal overflow.

Actual Chrome extension loading still requires the README manual checklist. The available in-app browser cannot load the unpacked Chrome extension. No submission capture, scoring, authentication, or deployment is implemented.

See phase-3.md for the dashboard walkthrough and phase-2.md for the API walkthrough.
