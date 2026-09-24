# Record on LeetCode

Load apps/extension as an unpacked Chrome extension, reload version 0.7.0 after updates, and refresh LeetCode. Start the local API first.

After a fresh submission transitions to Accepted, Recall opens a small on-page prompt. Choose On my own, With hints, or Read the solution. Confirm or change the prefilled practiced approach. Optional relevant topic checkboxes record context without refreshing additional patterns. Save practice closes the prompt only after confirmed persistence.

Run, stale Accepted pages, failed submissions, repeated result renders, and navigation do not automatically open the prompt. Both Submit and Ctrl/Cmd+Enter arm detection. Run or navigation cancels a pending trigger. The extension toolbar can manually open the recorder; these entries remain distinguishable as self-reported practice.

An uncertain save freezes and preserves the exact UUID, timestamp, assistance, approach, topics and provenance in extension storage. Reopening restores it. Retry does not create another attempt. Definitive validation failures unlock editing; network/server failures keep the recording for retry. Closing before saving does not persist a draft.

If the API cannot supply approach suggestions, recording remains possible under Needs classification. Unknown/general evidence never refreshes specific siblings.

The controlled fixture is available with npm.cmd run test:capture at http://127.0.0.1:8765. It uses real adapter/panel code with simulated verdicts and saves. It is not proof of compatibility with the latest live LeetCode markup; verify the signed-in Chrome extension after loading updates.
