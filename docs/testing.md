# Verification

- npm.cmd run check: ESLint, database-independent Node tests, Vite production build.
- npm.cmd run test:db: eight PostgreSQL integration tests in generated temporary schemas. Tests verify migrations, old-data backfill, immutable snapshots, import/reimport preservation, idempotent capture, approach corrections, contextual problem lookup, account isolation, filter queries, difficulty recovery, backup round trips, conflict rollback, timestamp preservation and removed-record recovery. Configure TEST_DATABASE_URL to use a separate database.
- npm.cmd run test:capture: controlled browser fixture on port 8765. No real LeetCode submission or database write occurs.

Strength regressions cover lasting breadth/reinforcement, pattern-specific breadth targets, legacy display strength, fading recency, diminishing returns, local-day grouping, assistance precedence, subpattern isolation, coverage gaps, and deep old experience versus shallow recent practice.

tests/browser-regressions.mjs exports verifyDashboard(tab, viewport, url) for the connected Codex browser API. Run against the local preview with only the tested tab active, using the documented viewport capability. It checks selected perspective, featured search and empty state, detail URL/reload/search/Back, Settings, and responsive overflow at 320/375/768/1024/1440px, asserting the viewport was applied. It performs no practice mutations and is separate from npm check.

Capture worker tests cover editable draft persistence, queued distinct Accepted events, worker restart, concurrent save serialization and reconciliation. The controlled browser fixture checks real panel interactions with mocked messages; signed-in Chrome imports, suspension, multiple tabs and live LeetCode layouts still require manual verification. Browser checks open/cancel the real editor; destructive/restore verification uses isolated database schemas.

Trigger regressions cover Run, stale Accepted, failed verdicts, navigation, repeated keyboard shortcuts, fresh Submit/Accepted, and duplicate result renders. Worker tests cover frozen pending payloads, restart recovery, invalid senders and uncertain save retries.

Browser verification covers the prompt after Accepted, no prompt after Run, offline retry preservation, close-on-save, full-width pattern navigation, responsive single-column rows, and preserved legacy history in the running dashboard. The signed-in Chrome profile is not available through the current browser connection; live LeetCode compatibility remains a manual verification step. See app-review.md for the user-facing checks.
