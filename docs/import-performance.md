# Bulk import saves — 9 October 2026

The API previously awaited separate PostgreSQL queries for every problem and every pattern association. This multiplied network latency between Render and Supabase. The extension already sends ten problems together, so increasing its batch size would not address the underlying query loop.

## Implementation

Both accepted-problem and recent-date imports now share bulk problem persistence:

1. Fold duplicate problem identities before writing. Retain the first title/URL, first available difficulty, last supplied provider-topic snapshot and union of pattern associations, matching the previous sequential behavior.
2. Validate the batch's distinct pattern slugs in one query.
3. Upsert all problems in one parameterized query and return their identities. Existing titles, URLs and known difficulties stay authoritative. Existing attempts, notes and manual placements are untouched.
4. Insert all pattern associations together.
5. Insert historical solves together, or insert recent submissions together and verify all submission identities in one read.

The existing account lock, transaction, completion check and run IDs remain in place. A conflicting recent submission ID rolls back the entire batch, including metadata changes. Retrying an acknowledged batch adds no duplicate solve or submission. Empty completion requests and older interrupted imports remain compatible. No migration or extension update is required.

## Measured comparison

Compared the previous committed repository implementation with the new implementation on a disposable local PostgreSQL 18 cluster. Each batch contained ten problems with Array, Hash Table and Math tags. A 30 ms delay was injected before each database query to demonstrate round-trip cost. These are controlled measurements, not production Render timings.

| Scenario | Previous queries | Bulk queries | Previous time | Bulk time |
| --- | ---: | ---: | ---: | ---: |
| Ten new problems | 86 | 10 | 3.710 s | 0.470 s |
| Retry the same batch | 96 | 10 | 3.935 s | 0.452 s |

The query counts include transaction and import-account/run checks. They exclude hosted authentication and schema/lifecycle overhead, which are unchanged. Recent-date imports with pattern associations use 13 queries even when twenty submissions reference the same problem. Query-count regression tests verify that the solved-import count is constant for one or ten problems.

## Verification and rollout

- 286 database-independent tests passed.
- All 24 PostgreSQL integration tests passed, including five new bulk-import cases covering bounded query counts, duplicate metadata semantics, account conflicts, concurrent batches, retry counts and complete rollback.
- ESLint, production build and whitespace checks passed.
- Tests and benchmarks used a temporary database listening only on localhost; production data was not accessed.

Commit and deploy the updated API on Render to activate the improvement. The existing extension can then resume its saved checkpoint. Production batch duration still depends on region alignment, server availability, authentication and database load; no production speedup was measured during this change.
