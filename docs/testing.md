# Verification

- npm.cmd run check: ESLint, database-independent Node tests, Vite production build.
- npm.cmd run test:db: eight PostgreSQL integration tests in generated temporary schemas. Tests verify migrations, old-data backfill, immutable snapshots, import/reimport preservation, idempotent capture, approach corrections, contextual problem lookup, account isolation, filter queries, difficulty recovery, backup round trips, conflict rollback, timestamp preservation and removed-record recovery. Configure TEST_DATABASE_URL to use a separate database.
- npm.cmd run test:capture: controlled browser fixture on port 8765. No real LeetCode submission or database write occurs.

Strength regressions cover lasting breadth/reinforcement, pattern-specific breadth targets, legacy display strength, fading recency, diminishing returns, local-day grouping, assistance precedence, subpattern isolation, coverage gaps, and deep old experience versus shallow recent practice.

The website frontend was reset on 2026-10-01, then rebuilt to the Phase 1 visual shell. Old UI tests were removed. The new shell passes lint/build, browser checks for click and keyboard Coverage/Retention switching, anchor navigation, and overflow checks at actual 320/376/769/1024/1440 CSS pixels. Live API views are planned for Phase 2; see frontend-rebuild.md.

Capture worker tests cover editable draft persistence, queued distinct Accepted events, worker restart, concurrent save serialization and reconciliation. The controlled browser fixture checks real panel interactions with mocked messages; signed-in Chrome imports, suspension, multiple tabs and live LeetCode layouts still require manual verification. Destructive/restore API verification uses isolated database schemas.

Trigger regressions cover Run, stale Accepted, failed verdicts, navigation, repeated keyboard shortcuts, fresh Submit/Accepted, and duplicate result renders. Worker tests cover frozen pending payloads, restart recovery, invalid senders and uncertain save retries.

Browser verification covers the prompt after Accepted, no prompt after Run, offline retry preservation, and close-on-save. Previous dashboard browser results describe the UI before its reset. The signed-in Chrome profile is not available through the current browser connection; live LeetCode compatibility remains a manual verification step. See app-review.md for the user-facing checks.
