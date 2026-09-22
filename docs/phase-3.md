# Phase 3: record practice in the dashboard

Use the existing Node/npm and PostgreSQL installation. No new dependencies or migrations were added in this phase.

## Start

```powershell
cd "C:\Users\bhuva\Documents\Projects\dsa-tracker"
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run dev
```

If the development server is already running, refresh the dashboard instead of starting another copy. Open http://127.0.0.1:5173.

## Record an attempt

1. Under Problem, leave the new-problem option selected and enter a LeetCode problem URL and title. Difficulty is optional. For later attempts, select an existing problem. Load more saved problems if the first 100 do not include it.
2. Explicitly choose Independently, With hints, or Saw the solution.
3. Select one or more patterns actually used for this attempt. These are not copied from the problem's possible approaches.
4. Check Attempt time, shown in your local time zone. Add optional notes, up to 5,000 characters.
5. Click Save attempt. After confirmation, the form resets and practice history refreshes to the newest page.
6. Refresh the browser to check persistence. History shows the assistance level, actual patterns, local time, notes, and a link to LeetCode. Previous/Next browse 20 attempts per page.

Adding an existing LeetCode URL reuses its problem record without overwriting its saved title, difficulty, or catalog tags. A new practice session creates another attempt on that problem.

## Interrupted saves

If a save cannot be confirmed, the form preserves and locks its details. Click Retry save when the API is available. The same request ID and timestamp are reused, so an already committed attempt is not inserted twice. Reloading the same tab also restores a pending save when session storage is available. Unsent forms are not autosaved; closing the tab or blocking browser storage can prevent reload recovery.

If history cannot load, the dashboard shows an error instead of claiming there are no attempts. Refresh retries history; the catalog error's Retry button reloads the catalog and history.

## Verify

```powershell
npm.cmd run check
npm.cmd run test:db
```

The first command runs lint, 77 tests, and the production build. The second checks real PostgreSQL behavior in a temporary schema. Browser verification details are in testing.md.

Historical solved imports remain available through the Phase 2 API and stay separate from practice history. The extension still recognizes LeetCode pages; it does not record attempts automatically. Authentication, scoring, and deployment remain later work.
