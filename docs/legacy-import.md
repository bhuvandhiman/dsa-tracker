# Legacy imports and reimports

Import is optional. The website's Connect LeetCode page and the extension's Import & recordings button open the same import screen, using the LeetCode account signed in to that Chrome profile.

Check for new solves creates a fresh run UUID after both phases finish. An interrupted run retains its frozen problem list and batch checkpoint. Resume verifies the provider account and continues that snapshot. Keep the import page and a signed-in LeetCode tab open, with Recall reachable. Another run cannot overlap the shared solved/recent import lock. Pause finishes the current step before stopping; closing the tab retains its last acknowledged checkpoint.

All accepted problems are deduplicated by platform identity. Imports preserve existing attempts, assistance, notes, dates, titles, and manual placement. Legacy evidence counts toward breadth but has no invented date or assistance. After importing, Recall automatically requests up to twenty available recent accepted submissions and records their dates with unknown assistance.

If recent-date retrieval fails, the accepted-problem import remains complete. Settings displays the failure and offers Retry recent dates. Undated subpatterns still receive an experience-based bar from distinct accepted problems, labeled “Prior solves · date unknown.” No historical completeness is claimed for provider dates.

The workspace is bound to one LeetCode username. Logged-out, changed-account, incomplete or invalid responses stop processing without silently skipping problems. Temporary network/server failures receive up to two retries, reusing the exact run ID and request payload. Long provider cooldowns require a later resume. Credentials never leave LeetCode; only account identity and problem/submission metadata reach Recall's API.

Local checkpoints and recordings can be stored during an API outage or expired session. Remote requests still require the current authenticated account. Lost final responses are recovered through the API's completion status before another import write. See [extension import reliability](extension-import-reliability.md) for verification and update instructions.

Existing installationId payloads remain accepted for recovery, while new requests use runId. SQL installation_id columns are retained as compatible run-identity storage.
