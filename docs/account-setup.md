# Recall accounts and setup

The account phase adds split signup/login screens with email/password
authentication through Supabase, email confirmation/resend, password recovery,
server-verified private workspaces and a three-step setup. Real sign-ins require
your Supabase project configuration. No real account or email was created during
development verification.

## Connect Supabase

1. Create your Supabase project and obtain its HTTPS project URL and **publishable
   key** from the dashboard. A legacy public `anon` key also works. Never use a
   secret or `service_role` key in Recall's authentication configuration.
2. Set these in `apps/api/.env` using `.env.example` as the reference:

   ```dotenv
   AUTH_MODE=supabase
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

   Keep the existing `DATABASE_URL` pointing to Recall's PostgreSQL database.
   Supabase handles identities; this phase keeps practice in the existing API
   database. The database role needs permission to create private schemas.
3. Enable email/password sign-in, email confirmation and a minimum password
   length of at least eight characters in Supabase Auth.
4. Set the development site URL to `http://127.0.0.1:5173`. Add these exact
   Redirect URLs under Supabase Auth URL Configuration:

   ```text
   http://127.0.0.1:5173/?auth=callback#/login
   http://127.0.0.1:5173/?auth=recovery#/reset-password
   ```

   If you use `localhost` instead, add the equivalent localhost URLs. Production
   requires the final HTTPS origin, deliberately configured in a later phase.
5. Google login is deferred. No Google Cloud project or Google provider setup
   is needed for the current email/password flow.
6. Restart the API and reload the frontend. Open `#/signup`. Test a real confirmed
   email signup, email/password login, logout and password-reset link in the same
   browser where each flow began. The default Supabase email sender only delivers
   to organization-team addresses and has tight limits. Test with your team email;
   configure custom SMTP before inviting other users.

The client uses Supabase's PKCE flow and session refresh. The API validates every
private request against Supabase Auth's user endpoint. Browser-supplied user IDs
cannot select workspaces. Missing, revoked or unconfirmed sessions are rejected.
An Auth outage returns an error rather than falling back to the local workspace.

Official references: [password authentication](https://supabase.com/docs/guides/auth/passwords),
[email delivery](https://supabase.com/docs/guides/auth/auth-smtp),
[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[public and secret keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Existing local data and account isolation

`AUTH_MODE=local` preserves the existing single-user behavior. Development did
not change your real `.env`, import records or goal settings. Enabling accounts
starts each verified user with a separate workspace; it does not automatically
assign the existing local data to the first person who signs in.

If you want to transfer your local practice, export a backup from Workspace
while in local mode, then explicitly review and restore it into your own signed-in
workspace. Keep the original backup. Switching back to local mode restores access
to the original local workspace.

Isolation uses a validated UUID-derived PostgreSQL schema per user, with all
existing repository tables and migrations inside that schema. Pool checkouts
select only that schema and reset before reuse. Goals, attempts, imports, capture
retry IDs, placement corrections, queue snapshots and backups share this boundary.
There is no public-schema fallback. Schemas share the original connection pool;
this is not one pool per user. This is the first account implementation, not a
claim of large-scale hosting readiness.

## Extension installation

`#/install-extension` is available before login and during setup. It provides the
ZIP, extraction/Load unpacked steps and a video placeholder. Run
`npm run package:extension` after changing extension files. The portable archive
contains only the manifest, scripts, icons and popup/setup assets, with
`manifest.json` at its root. The frontend build copies it into `dist/downloads`.

Set `EXTENSION_VIDEO_URL` to a direct HTTPS video file URL when your walkthrough
is ready. Native video controls are already implemented. Later, set
`EXTENSION_STORE_URL` to the `https://chromewebstore.google.com/...` listing;
the page changes its button and instructions to the store flow. Restart the API
after changing either setting.

The installation acknowledgement is a user confirmation. The bundled extension
connects to the local API and supports email/password authentication:

1. Restart `npm run dev` after updating the API.
2. Reload Recall on `chrome://extensions`, then refresh your LeetCode tabs.
3. Open Recall extension Settings and sign in with the same confirmed email and
   password used on the website. Website login does not sign in the extension.
4. Keep a signed-in LeetCode tab open, then import previously solved problems.

Passwords are forwarded once to the configured Supabase project and never saved.
Tokens live in Chrome's session storage, unavailable to content scripts. Sign in
again after Chrome restarts or the extension reloads; sessions refresh while Chrome
is running. Imports, drafts, queues and unfinished saves use account-specific
local storage. Switching accounts blocks old pages until refreshed. Existing
unscoped local drafts remain preserved for local mode and are not automatically
assigned to a Supabase account. Hosted imports still require deployment work.

## Validation and local fixtures

`npm run check`: lint, 217 unit tests and production build.
`npm run test:db`: 13 isolated PostgreSQL integration tests, including cross-account
solve/goal/capture/backup isolation and rollback/pool reuse. Owned test schemas
are cleaned up; existing practice data is not used as test data.

For repeatable UI checks without real Supabase credentials:

```text
npm run test:accounts
```

In a second terminal, start web Vite with `API_PROXY_TARGET=http://127.0.0.1:8766`
and port `5175`. Open `http://127.0.0.1:5175/#/signup`.
Fixture login is `fixture@example.test` / `fixture-password`.
`http://127.0.0.1:8766/fixture` provides reset/failure controls. No external
account, email or production database calls occur. Never deploy this test server.

Browser verification covers confirmation/resend, invalid/valid login, local PKCE
callback, saved focus/target, setup reload, failed-save retry, setup completion,
logout/private-route protection, password-recovery request and show/hide control.
Light/dark layouts fit 390px and 320px without horizontal overflow. The ZIP
download was verified, and its 29 entries match extension source byte for byte.
Real email delivery and password changes require project configuration.
Google sign-in was subsequently removed from the UI at the user's request; the
current flow is email/password only.

`npm run test:extension-ui` serves real extension pages on port 8766 with simulated
Chrome account/import messages. Use `fixture@example.test` / `fixture-password`;
an email starting with `other` selects a separate simulated workspace. Do not run
it at the same time as `test:accounts`. This fixture does not contact Supabase,
LeetCode or PostgreSQL. Automated extension tests cover session refresh, logout
during refresh, stale-account rejection, trusted message senders, draft isolation
and API mode changes. Real account sign-in and LeetCode imports need user checks.

The API remains loopback-only. Public HTTPS hosting, trusted production origins,
operational backups/monitoring, privacy information and account deletion remain
launch work.
