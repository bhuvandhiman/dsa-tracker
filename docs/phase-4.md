# Phase 4: start an attempt from LeetCode

This phase connects the extension to the existing practice form. No new packages, migrations, permissions, or API endpoints are required.

## Start and reload

Start PostgreSQL and run these commands in PowerShell (skip starting another server if one is already running):

```powershell
cd "C:\Users\bhuva\Documents\Projects\dsa-tracker"
npm.cmd run dev
```

1. Open chrome://extensions in Chrome.
2. Click Reload on Recall. For a first installation, enable Developer mode, click Load unpacked, and select apps/extension in this repository.
3. Open https://leetcode.com/problems/two-sum/ and refresh that tab after updating the extension.
4. Open Recall. Expect version 0.2.0 and two-sum.
5. Click Record this problem. A new dashboard tab opens with the canonical URL and a suggested title. The title comes from the URL slug; review it before saving.
6. Choose assistance and the actual practiced patterns. Add optional notes, check the time, and click Save attempt.
7. Verify that history shows the attempt and it persists after refreshing.

An existing problem URL reuses its identity and retains saved catalog metadata. Each explicit new save records another practice attempt. Opening the popup or dashboard alone records nothing.

## Manual Chrome checks

- On non-problem LeetCode pages and other websites, recording is disabled with guidance.
- Navigate between problems without reloading: the popup should show the current one. Record checks the identity again before opening the dashboard.
- Close the popup before recording: no attempt should appear.
- With the server stopped, the dashboard cannot load. Start the server and reload that tab; its problem link remains until a save succeeds.
- An uncertain save offers Retry save. A pending save in the same tab takes priority over a different incoming problem link. Finish the pending save, then reopen the desired problem from the extension.

The extension targets http://127.0.0.1:5173. For a different dashboard port, change the destination in apps/extension/src/recorder.js and reload the extension. The popup confirms that a tab opened, not that the server is running.

## Verification scope

Run npm.cmd run check for lint, 86 tests, and the production build. Popup tests mock Chrome APIs. Dashboard handoff was checked in a browser against an isolated PostgreSQL schema: prefill without writes, pending-save preservation, retry without duplicate attempts, and clearing the launch link after success.

The in-app browser cannot load the unpacked extension; complete the Chrome checklist above to verify installation in your profile. No automatic submission detection, scoring, or authentication was added.
