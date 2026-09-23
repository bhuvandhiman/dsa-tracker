# Phase 6: accepted-submission prompt

No new dependencies, permissions, API routes, or database migrations are required. This is best-effort DOM detection followed by explicit recording, not automatic saving.

## Start and reload

1. Start PostgreSQL and run `npm.cmd run dev` from this repository if the dashboard is not already running.
2. Open `chrome://extensions` and reload Recall. Its version is now 0.3.0.
3. Refresh existing LeetCode problem tabs to load the new content script.
4. Solve a problem and use Submit (or Ctrl/Cmd+Enter).
5. When the new submission shows Accepted, Recall should offer a reminder in the lower-right corner.
6. Click Open recording form. Review the title and local attempt time, choose assistance and actual practiced patterns, and save.

The time is when Recall detected acceptance, rounded to the form's minute precision. It is editable. The title comes from the current problem title link where available; otherwise the form suggests a title from the URL. Difficulty, assistance, notes, and practiced patterns are not inferred from acceptance.

Dismiss hides the reminder without saving. Opening the form also saves nothing until you submit it. If the local server is stopped, start it and reload the opened form tab.

## Detection boundaries

The detector requires a trusted Submit action followed within two minutes by a new `/problems/<slug>/submissions/<numeric-id>/` URL and a visible `[data-e2e-locator="submission-result"]` element whose text is exactly Accepted. These rules live in the LeetCode adapter.

Run results, aggregate statistics, old submission pages opened without a fresh Submit, and failed verdicts do not trigger it. Leaving the problem cancels capture. Reloading loses in-progress detection. Alternate layouts, localization, full-page navigation, changed markup, or an unobserved loading transition may cause a missed prompt. Use the popup's Record this problem action as the fallback.

Deduplication covers prompts within a page session, not saved attempts across tabs or repeated explicit submissions of the form. The backend still protects retries of the same save through its request ID.

## Live Chrome verification still required

The public Submit and title markup was inspected. An authenticated accepted-result page was not available for automated verification. Test one real submission in your Chrome profile before relying on automatic prompts:

- Accepted after Submit: one reminder with the correct problem/title and time near acceptance.
- Wrong Answer or Run success: no reminder.
- Open an older accepted submission: no reminder.
- Dismiss a reminder: it stays dismissed for that result.
- Navigate to another problem: the old reminder disappears.
- Open the form: assistance and patterns remain blank, and nothing is stored until Save attempt.

If a successful submission gives no prompt, use the popup fallback. The adapter may need adjustment to your current result markup; no source code or account credentials are needed for that adjustment.

## Reproducible fixture

Run `npm.cmd run test:capture` and open http://127.0.0.1:8765. The fixture runs the actual adapter, state machine, and prompt UI with simulated results and mocked extension messaging. Use Run fixture, View old accepted submission, the verdict selector, Submit fixture, and Navigate to 3Sum. Open recording form displays the generated URL rather than opening a tab. No real submission or database write occurs. Ctrl+C stops the fixture.

Run `npm.cmd run check` for lint, 99 automated tests, and the production build. The fixture does not prove that LeetCode's authenticated markup remains compatible; keep the live check separate.
