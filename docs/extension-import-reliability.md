# Extension import reliability — 2026-10-09

## Findings

The screenshot shows a generic connection failure. It does not identify whether the request timed out, Render was unavailable, or another network failure occurred. No matching production server log was supplied, so the exact incident remains unconfirmed.

The code review found avoidable failure paths: a 15-second API deadline, repeated uncoalesced configuration reads, local checkpoint writes dependent on live API access, two separate controllers for solved problems and recent dates, and opaque errors when proxies returned HTML. Resuming also rescanned a complete frozen problem list. Recording saves had a separate 10-second deadline.

## Changes

- One controller and one shared lock now own both import phases. A second tab cannot overwrite the active import's progress. Popup navigation reuses the existing import tab.
- API requests use a 25-second deadline. Configuration reads are coalesced and cached for 60 seconds in worker memory. Cancellation remains supported.
- Only idempotent import writes and read-only provider requests receive automatic retries: at most two, with a stable run ID/body and bounded cooldowns. Authentication, account conflicts and validation errors stop immediately.
- Per-account checkpoints and drafts use the known local identity during outages or expired access. This identity never authorizes an API request; live authentication and account checks remain required for remote writes.
- Resume verifies the LeetCode account and uses the frozen solved list and acknowledged offset. Lost final responses are checked against server completion before replaying a write. Recent dates remain a separate resumable phase of the same run.
- Pause stops after the current step and preserves progress. A new import resets both phase checkpoints in one storage write, only after explicit Check for new solves.
- A damaged recent snapshot can be rebuilt from verified provider data after server status confirms it was not committed. The API imports recent dates atomically.
- The import screen has one primary action, progress and a dashboard link. Technical details and unfinished recordings use collapsed disclosures. Required recording topic classification remains unchanged.
- Recording saves and reconciliation use the shared request deadline and safe response decoder. Uncertain failures keep the exact pending recording. Malformed saved links no longer prevent valid recordings from appearing.

Problem classification, goal counts, queue order and retention policy were not changed by this work. Existing notes, practice and import checkpoints are retained.

## Verification

The full automated suite passed, including new import-controller and request-recovery tests. ESLint passed. Tests cover pause during save, competing tabs, account switches, expired local access, lost batch/final responses, partial recent-date completion, corrupt checkpoints, malformed responses and bounded retries. Existing capture, classification, counts, threshold, authentication and website-bridge tests also passed. Production frontend build and hosted extension packaging passed.

Tests use mocked Chrome messages/provider data and local HTTP fixtures; they do not write to the production database. Real Chrome/LeetCode/Render import verification remains pending because the browser tool could not start. The 21st CLI was unavailable for visual search/review; existing extension controls, native progress/details and project theme tokens were reused.

## Update the installed extension

1. Use version 0.12.1 from the hosted ZIP built for `https://recall-nqmz.onrender.com`. The source `apps/extension` folder still defaults to local development endpoints.
2. Close the import tab. Extract the new ZIP into the existing unpacked extension directory, replacing its files. Keep the same folder and installed extension; uninstalling clears local checkpoints and drafts.
3. Reload Recall in `chrome://extensions`. Refresh the Recall website and sign in if needed so its session reconnects the extension. Refresh the signed-in LeetCode tab.
4. Open Import & recordings and choose Resume import or Retry recent dates. Check for new solves is available once both phases are complete.
5. If a failure remains, retain the checkpoint and compare the displayed specific error with the Render log at the same time. A session error requires reconnecting; a network/server error can resume later; a provider-account mismatch requires the original LeetCode account.
