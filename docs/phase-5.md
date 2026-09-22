# Phase 5: review queue

No new dependencies or migrations are required. Start PostgreSQL, then run npm.cmd run dev from the repository. If an older API is running, stop and restart it because this phase adds an API route. Refresh the dashboard at http://127.0.0.1:5173.

## How it works

- Each problem with at least one recorded practice attempt has one schedule.
- The latest practice time determines the schedule: saw the solution = 1 day; hints = 3 days; independently = 7 days.
- A day means 24 elapsed hours. Dates display in your browser's local time zone.
- A problem is due at or after its scheduled time. Due now shows only these problems; All scheduled also includes upcoming reviews.
- Reviews sort by scheduled time, oldest first, with 10 per page.
- These fixed intervals are a simple starting policy, not a measurement of mastery or retention. Repeated independent attempts still use seven days in this phase.
- Historical imports alone are excluded because their actual practice time and assistance are unknown.
- Entering an older attempt later does not replace a newer practice event. Equal practice times use creation time, then UUID, as a deterministic tie-breaker.

## Practice and record

1. Look at Review queue and its due count.
2. Click Practice on LeetCode to open a problem in another tab.
3. After practicing, use Record another attempt, the extension, or the existing dashboard form. The record link opens a separate tab so it does not overwrite a form you were editing.
4. Explicitly select assistance and actual practiced patterns, then save.
5. The queue in the saving tab refreshes. In another already-open tab, click Refresh reviews to fetch the updated schedule.

Opening a link never marks a review completed. Only a recorded attempt updates the schedule. The queue shows its last checked time; click Refresh reviews after time passes. If a queue becomes empty on a later page after saving, refresh to return to page one. Jump to recording form skips a long queue.

## Verify

Run npm.cmd run check for lint, 90 tests, and a production build. Run npm.cmd run test:db for both isolated PostgreSQL suites. Temporary test schemas are removed afterward.

Try a past-dated practice attempt to see a due item, then record another attempt with the current time. The problem should move to an upcoming date. Use disposable practice data only if you intend to retain it; this phase does not add deletion/editing controls.

The API returns errors rather than treating an unavailable database as an empty queue. Use Refresh reviews to retry after restoring the API/database.
