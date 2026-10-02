# Recall accounts and setup

The account phase adds split signup/login screens, Google and email/password
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
5. Enable the Google provider. Configure its client ID and secret in Supabase,
   using the provider's displayed Supabase callback URL as the Google OAuth
   authorized redirect URI. Those credentials do not belong in this repository.
6. Restart the API and reload the frontend. Open `#/signup`. Test a real confirmed
   email signup, Google login, logout and password-reset link in the same browser
   where each flow began. Configure email delivery/SMTP before a public launch.

The client uses Supabase's PKCE flow and session refresh. The API validates every
private request against Supabase Auth's user endpoint. Browser-supplied user IDs
cannot select workspaces. Missing, revoked or unconfirmed sessions are rejected.
An Auth outage returns an error rather than falling back to the local workspace.

Official references: [password authentication](https://supabase.com/docs/guides/auth/passwords),
[Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google),
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

The installation acknowledgement is a user confirmation, not automatic extension
detection or pairing. The bundled extension still connects to the local API.
Authenticated extension pairing, account-specific drafts/retries and hosted
imports are **the next phase**. Loading the ZIP alone does not connect an
extension to a Supabase account. Keep local mode for the working local recorder
until that pairing phase is implemented.

## Validation and local fixtures

`npm run check`: lint, 205 unit tests and production build.
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
`http://127.0.0.1:8766/fixture` provides reset/failure controls. The simulated
Google button redirects locally; no Google, email or production database calls
occur. Never deploy this test server.

Browser verification covers confirmation/resend, invalid/valid login, local PKCE
callback, saved focus/target, setup reload, failed-save retry, setup completion,
logout/private-route protection, password-recovery request and show/hide control.
Light/dark layouts fit 390px and 320px without horizontal overflow. The ZIP
download was verified, and its 24 entries match extension source byte for byte.
Real Google/email delivery and password changes await project configuration.

The API remains loopback-only. Public HTTPS hosting, trusted production origins,
operational backups/monitoring, privacy information and account deletion remain
launch work, after extension pairing.
