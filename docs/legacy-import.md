# Legacy imports and reimports

First-time setup offers importing all accepted problems from the LeetCode account signed in to the same Chrome profile, or skipping. After setup, import actions are available only inside extension Settings.

Each Settings reimport creates a fresh run UUID. An interrupted run retains its frozen problem list and batch checkpoint. Keep the setup page, a signed-in LeetCode tab and the local API available. Another run cannot overlap the current legacy/recent import lock.

All accepted problems are deduplicated by platform identity. Imports preserve existing attempts, assistance, notes, dates, titles, and manual placement. Legacy evidence counts toward breadth but has no invented date or assistance. After importing, Recall automatically requests up to twenty available recent accepted submissions and records their dates with unknown assistance.

If recent-date retrieval fails, the accepted-problem import remains complete. Settings displays the failure and offers Retry recent dates. Undated subpatterns still receive an experience-based bar from distinct accepted problems, labeled “Prior solves · date unknown.” No historical completeness is claimed for provider dates.

The workspace is bound to one LeetCode username. Logged-out, changed-account, rate-limited, incomplete or invalid responses stop processing without silently skipping problems. Credentials never leave LeetCode; only account identity and problem/submission metadata reach the local API.

Existing installationId payloads remain accepted for recovery, while new requests use runId. SQL installation_id columns are retained as compatible run-identity storage.
