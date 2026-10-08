# Guided onboarding and practice flow

Implemented from the 8 October 2026 UX audit. The existing palette, pattern ordering, classification rules, coverage calculations, and retention scoring remain unchanged.

## User journey

- New accounts choose a focus and enter the workspace. Goal tuning is optional; installing the extension is no longer a condition of workspace access.
- Dashboard and Settings link to `#/connect`. This page contains installation instructions, actual Recall connection status, an explicit LeetCode account check, and import progress.
- Installation opens or reuses the configured Recall website rather than opening a competing extension setup wizard. After loading an unpacked extension, refresh the website to inject the newly installed bridge.
- Import starts/resumes in a dedicated extension tab. Keep that tab open; the website polls a compact account-scoped summary every five seconds. Closing the tab preserves existing checkpoints for resumption.
- Previous solves and available recent dates have distinct completion states. Partial results remain usable. Recovered imports without a stored count do not report zero.
- Empty dashboards offer connection and pattern exploration. Recommended subpatterns open automatically. Saved problems supply a review suggestion ordered by last practice; empty libraries offer a link to LeetCode's problem browser, not a fabricated recommendation.
- Practice still requires assistance and explicit topic/manual-pattern confirmation. Save confirmation names the recorded practice pattern when its verified unit is present in the catalog and links back to that pattern.
- Login preserves an allowlisted internal destination. Mobile authentication places the form first. Outdated double-login instructions and the empty video placeholder have been removed.

## Connection contract

The existing exact-origin, top-frame website bridge still transfers short-lived access credentials only. It now acknowledges connection success/failure and exposes three commands: STATUS, CHECK_LEETCODE, and OPEN_IMPORT.

Requests use the content script's nonce plus unique request IDs; mismatched origins, frames, nonces and response IDs are ignored. Each worker action verifies the active account scope. Status returns only import summary fields, not credentials, problem snapshots, or drafts. Unique session revisions prevent a stale login acknowledgement from overriding a newer renewal.

Protocol version 2 distinguishes extensions that support the guided flow. Older versions prompt an update instead of appearing stuck connecting. Chrome restart/reload still clears the extension's session-only credentials; returning to the signed-in website reconnects it.

The LeetCode check verifies the currently selected LeetCode tab at that moment. Imports independently recheck the provider account before saving. It is not presented as permanent evidence that LeetCode remains signed in.

## Update instructions

Deploy the website/API together with extension version 0.12.0. The Render build should package the extension with the deployed origin before building the website, as documented in the deployment guide.

For an unpacked hosted extension, download the updated hosted ZIP, replace the files in its existing folder, click Reload in Chrome Extensions, and refresh Recall and LeetCode. Keep the same extension folder to preserve drafts/checkpoints. The project source folder continues to use local runtime origins; do not use that local configuration to connect to Render.

No database migration is required. The historical extensionAcknowledged field remains compatible with old clients but is no longer treated as proof of connectivity or a setup requirement.

## Verification

- Full Node suite: 267 tests passed, including existing scoring, classification, import, and account-isolation coverage.
- Added connection summary, tab reuse, provider verification, return-navigation, stale acknowledgement, nonce/origin isolation, and request-cancellation checks.
- ESLint, Vite production build, and extension packaging passed.
- Browser automation could not start because the Windows sandbox helper failed. Real desktop/mobile layouts, Chrome extension installation and messaging, and a real Supabase/LeetCode import still require browser verification. These checks did not contact a user's private account or modify production data.

Manual smoke test: signup → focus → dashboard → Connect LeetCode → install/reload → verify connected → check LeetCode → start import → return to website and observe progress → open a recommended pattern → record practice → confirm its pattern link. Repeat after browser restart, with an older extension, while LeetCode is signed out, after an interrupted import, and after switching Recall accounts. Verify narrow-screen login and the option to postpone installation.
