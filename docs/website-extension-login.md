# Website login connection

Recall extension 0.11.0 removes the separate account password form. Sign in on
the website in the same Chrome profile, then refresh its tab after installing
or reloading the extension. **Connect through Recall** opens the configured
website when needed. Settings reloads after connection or account changes;
routine token renewals do not interrupt imports.

The website and an isolated content script exchange same-origin messages using
a per-tab nonce. The worker separately restricts the sender to its own extension,
the top frame, and the exact configured website origin (including its port).
The API verifies the access token against the configured Supabase project and
uses that verified account identity and JWT expiry. No claimed account alone
can connect. Auth responses are uncached. Chrome session storage contains the
short-lived access token; it never receives the website refresh token/password.

The website updates the extension on login and token renewal. Signing out clears
the matching website connection, cancels pending verification, and prevents late
responses from recreating it. Older tokens cannot replace newer saved tokens.
Drafts and import checkpoints retain their existing account namespaces.

If Recall remains closed until access expires, requests stop and ask you to
reopen the website. Its saved login renews the connection when still valid.
Reopen/refresh Recall after Chrome restarts or extension reloads as well.
This is a first-party session bridge, not a separate OAuth provider. Keeping
refresh ownership on the website avoids competing refresh-token reuse; see
[Supabase session documentation](https://supabase.com/docs/guides/auth/sessions).
The isolated-script messaging follows
[Chrome's content-script model](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).

Hosted packaging sets the bridge match to the exact HTTPS Recall origin and
removes localhost permissions. The source package matches loopback for local
development; the worker accepts only the configured website port. No additional
Chrome permissions or Supabase settings are required.

Validation: 13 targeted regressions cover verified identity, expired sessions,
origin/frame/nonce guards, account changes, stale reads, early sign-out, pending
verification and uninterrupted renewal. The browser UI fixture verifies removal
of the password form and connection enabling imports; it simulates Chrome and
does not prove a live Supabase/Chrome connection. Check that once after deploying
the website/API and replacing the installed extension with the new hosted ZIP.

## Imports on the Connect page (0.13.0)

Installation instructions expand immediately under the Installation steps button.
Import my solves starts a background job and keeps the website on Connect. The
same page shows progress, connection errors, pause/resume, and the dashboard
link after accepted problems are saved. Extension Settings remains an optional
control surface for the same job; it does not run a separate importer.

Bridge protocol 3 adds START_IMPORT and PAUSE_IMPORT under the existing exact
origin, top-frame, nonce and verified-owner checks. STATUS returns only counts,
phase and error summaries. The legacy OPEN_IMPORT command remains compatible
with older clients; the current website never uses it. Update the installed
extension and refresh Recall and LeetCode after deploying this change.

One extension-origin Web Lock prevents parallel import sessions. A serialized
writer persists progress, while the existing account-scoped snapshots and
acknowledged-batch checkpoints allow safe resume after a worker restart.
Ten-second storage activity keeps a user-started job active during long provider
reads; resume remains available if Chrome interrupts it. This follows Chrome's
[service-worker lifetime guidance](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).
No additional Chrome permissions, database migration, or auth settings are needed.

For isolated browser QA, run `npm run test:website-import`, then open
`http://127.0.0.1:5175/#/connect`. Add `?fixture=missing`, `?fixture=outdated`, or
`?fixture=failed` before the hash to exercise installation, upgrades, and provider
errors. This uses the real import engine with simulated LeetCode/API data; it
does not access a live account or database.
