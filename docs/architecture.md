# Architecture through Phase 5

## Boundaries

Dashboard → Vite same-origin /api proxy → Express route → input validator → PostgreSQL repository.

The dashboard loads patterns and saved problems, validates a manual attempt, resolves the problem identity, and saves the attempt. History reads 21 rows at a time to display 20 and detect a next page. Local form times are converted to UTC for storage and displayed in the browser time zone. Health is liveness only and never claims database readiness.

The extension uses popup → service worker for readiness and popup → content script → LeetCode adapter for identity. Record this problem rechecks that identity and opens the fixed local dashboard with a canonical problem URL. The dashboard validates the link through its own adapter, suggests an editable title from the slug, and leaves assistance and patterns unselected. No submission data is read. The backend also validates URLs through a LeetCode adapter. A future Codeforces adapter will produce the same platform/externalId/url identity, with a separately reviewed extension host match.

Opening a tab uses chrome.tabs.create with no additional permissions; see the [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs). All writes still originate from the dashboard through its proxy, so no CORS changes or extension API host permissions are needed. A pending save takes priority over a new launch link. After successful saving, the launch parameter is removed so reloading starts a blank form.

## Review scheduling

GET /api/reviews derives one schedule per practiced problem from the latest attempted_at, with created_at and UUID as deterministic tie-breakers. Historical-only problems have no schedule. A backdated entry cannot replace a later practice event. Intervals come from review-policy.js: solution 1 day, hint 3, independent 7. A day is exactly 24 elapsed hours, including across daylight-saving changes. Due means dueAt <= the server-provided asOf time.

One SQL statement computes counts and paginated rows in the same database snapshot. Due and all views sort by dueAt then problemId; this is ordinary offset pagination, so concurrent new attempts can move page boundaries. No stored score, scheduler process, migration, or background job is needed. The browser presents a dated snapshot, refreshes after saving in that tab, and offers manual refresh for time passing or changes in other tabs.

## Relationships

```text
problems ──< problem_patterns >── patterns
   │
   ├──< attempts ──< attempt_patterns >── patterns
   │
   └── historical_solves (zero or one per problem)
```

- A problem is unique by (platform, external_id), not by its title or full page URL.
- problem_patterns records possible approaches in the catalog.
- An attempt is a manually reported completed solve, with one of independent/hint/solution, UTC timestamp, optional notes, and at least one explicitly chosen practiced pattern.
- attempt_patterns records actual approaches for that attempt. It does not inherit every catalog tag. Changing catalog patterns cannot rewrite old attempts.
- Historical solves indicate prior completion with unknown assistance, patterns used, and solve time. imported_at is the import time, not the solve time. No fake attempt or confidence is created.
- Multiple attempts on the same problem are allowed. A retry uses the same requestId; a genuinely new practice session gets a new requestId.

All data belongs to one local workspace. Before adding accounts, introduce explicit ownership through a migration. There is no authentication or public deployment in this phase.

## Write guarantees

Every multi-table write runs BEGIN/COMMIT/ROLLBACK on one checked-out pg client. SQL values are parameterized. Database constraints cover primary keys, unique identities, foreign keys, allowed assistance/difficulty values, and note bounds.

Attempt request IDs are caller-generated version-4 UUIDs. A hash of the normalized payload distinguishes a retry from an accidental reuse with different data. Concurrent retries create one attempt; a conflicting payload receives 409. Timestamps are supplied by the caller so a retry does not acquire a new time.

Problem creation deduplicates by platform identity. An existing problem is returned without overwriting its catalog metadata. Replace catalog patterns explicitly with PUT /api/problems/:id/patterns. Replacements lock the problem row to avoid mixing concurrent sets.

Historical import batches contain 1–100 existing problem IDs. IDs are deduplicated. The whole batch succeeds or fails; repeated imports do not duplicate evidence.

The dashboard creates one request ID and freezes its payload before sending. Uncertain network/server failures preserve that payload in memory and sessionStorage for a same-tab reload. Retrying reuses the same ID and timestamp. A successful response clears the pending save. If browser storage is blocked, in-memory retries remain available but reload recovery is unavailable. An unsent form is not autosaved. Problem creation and attempt creation are separate requests, so a failed attempt may leave a reusable catalog problem.

## Migrations and failures

db:migrate applies ordered SQL files within a transaction, records checksums, and serializes runners with a PostgreSQL advisory transaction lock. It never drops application data. New changes require new migration files.

With no DATABASE_URL, the API still starts and health returns 200, while data routes return 503. Missing schema and connection failures also return actionable 503 errors rather than pretending the database is empty.

## References

The implementation follows [pg parameterized queries](https://node-postgres.com/features/queries) and [pg transaction guidance](https://node-postgres.com/features/transactions). The latter requires using the same client throughout a transaction.

