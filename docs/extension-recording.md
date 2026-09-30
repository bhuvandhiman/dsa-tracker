# Record on LeetCode

Load apps/extension as an unpacked Chrome extension, reload version 0.8.0 after updates, restart the API, and refresh LeetCode. Start the local API first.

After a fresh submission transitions to Accepted, Recall opens a small on-page prompt. Choose On my own, With hints, or Read the solution. Confirm or change the prefilled practiced approach. Optional relevant topic checkboxes record context without refreshing additional patterns. Save practice closes the prompt only after confirmed persistence.

Run, stale Accepted pages, failed submissions, repeated result renders, and navigation do not automatically open the prompt. Both Submit and Ctrl/Cmd+Enter arm detection. Run or navigation cancels a pending trigger. The extension toolbar can manually open the recorder; these entries remain distinguishable as self-reported practice.

An uncertain save freezes and preserves the exact UUID, timestamp, assistance, approach, topics and provenance in extension storage. Reopening restores it. Retry does not create another attempt. Definitive validation failures unlock editing; network/server failures keep the recording for retry. Changes and closing retain an editable draft. Extra Accepted submissions are queued, including when an older draft is restored. Confirmed saves show success feedback and open the next queued recording.

Use Check whether this recording was saved to reconcile an uncertain response. A matching saved request clears the local pending copy; a removed request directs you to dashboard recovery. A confirmed conflicting ID allows keeping an archived copy before starting a separate recording. Settings lists all local drafts, pending saves and queued submissions, and can download conflict choices.

The panel focuses its close button, supports Escape and returns focus without trapping the page. Manual time can be edited in labelled browser time; Accepted evidence starts at detection time and retains that time while filling the form. Provider metadata is fetched if Topics is collapsed, without sending cookies to Recall. New saves verify the signed-in account and the API checks it against the bound workspace.

The form renders before fetching approach suggestions. If the API cannot supply them, the form explains the fallback, offers Retry approaches, and permits Needs classification. Unknown/general evidence never refreshes specific siblings.

The controlled fixture is available with npm.cmd run test:capture at http://127.0.0.1:8765. It uses real adapter/panel code with simulated verdicts and saves. It is not proof of compatibility with the latest live LeetCode markup; verify the signed-in Chrome extension after loading updates.
