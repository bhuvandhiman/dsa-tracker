# Deploy the Recall preview on Render + Supabase

The repository is prepared for one Render Node web service that serves both
the built React website and `/api`. Supabase supplies email/password Auth and
PostgreSQL. You do not need to buy a domain: Render gives the service an HTTPS
`*.onrender.com` address. This guide does not create accounts or deploy anything.

## 1. Save your local practice and code

1. Download a **Backup & restore** JSON from your current Workspace and keep it
   somewhere private. Local practice does not automatically move to Supabase.
2. Commit and push the project to your GitHub/GitLab repository yourself. Include
   `render.yaml` and the lockfile. Never commit `.env` or database passwords.
3. Run `npm run check` and `npm run test:db` locally before publishing changes.
   The database suite uses isolated test schemas, not your practice records.

## 2. Prepare the existing Supabase project

1. Open your project in the Supabase dashboard. Keep email/password login and
   email confirmation enabled. Google is not needed.
2. Copy the **project URL** (the HTTPS origin only) and **publishable key** from
   the project API settings. These become `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY` on Render.
3. Open **Connect** and choose **Session pooler**, port **5432**. Copy the
   PostgreSQL connection string, replacing its password placeholder with your
   database password. Percent-encode password characters such as `@`, `#`, `/`
   and `%` when included in a URL. This becomes `DATABASE_URL`.
4. Do **not** use Transaction pooler/6543. Recall uses connection session state
   for private schemas and deletion locks. The API rejects that pooler mode.
5. Download the database CA certificate from Supabase's database settings if
   required by your project. Put the complete PEM text into `DATABASE_CA_CERT`.
   A literal `\n` between PEM lines also works. Recall verifies the TLS
   certificate; do not disable verification or use `sslmode=no-verify`.
6. Obtain a server-only **secret key** (or legacy `service_role` key) for
   `SUPABASE_SECRET_KEY`. It enables account deletion. Put it only in Render's
   environment settings, never a frontend `VITE_*` setting or an extension file.
   Leaving it unset disables the delete button; configure it before inviting
   public users. The ordinary public key remains separate.

Recall creates UUID-derived private schemas and runs their migrations on first
verified access. The database role must be able to create schemas and tables.
You do not need to migrate the shared/local `public` workspace on Render. Browser
clients never connect to these schemas directly; the API verifies each account.

## 3. Create the Render service

1. Create/sign into [Render](https://render.com/) and connect the repository.
2. Choose **New → Blueprint**, select the repository and branch, and use the
   root `render.yaml`. Review the proposed **Free** Node web service.
3. Supply the Supabase environment values from step 2 when prompted. Choose a
   region close to your Supabase database. The environment values stay in the
   dashboard; do not paste them into chat or source files.
4. Confirm the service settings:

   | Setting | Value |
   | --- | --- |
   | Root directory | Repository root |
   | Build command | `npm ci --include=dev && npm run package:extension && npm run build` |
   | Start command | `node apps/api/src/server.js` |
   | Health check | `/api/health` |
   | Deployment mode | `DEPLOYMENT_MODE=hosted` |
   | Authentication | `AUTH_MODE=supabase` |
   | Node | `22.20.0` |

5. Create the service to start its first deployment. Future automatic deploys
   are off in the Blueprint; use **Manual Deploy → Deploy latest commit** when
   you decide an update is ready.
6. Open the assigned HTTPS address. `RENDER_EXTERNAL_URL` supplies the trusted
   origin at build time and runtime. No `APP_ORIGIN` is needed for the default
   Render address. Do not set `HOST` to localhost on Render or override `PORT`.

If you create a web service manually rather than using the Blueprint, enter the
same settings and environment values. The first build creates a hosted extension
ZIP configured for this service's exact origin, then Vite copies it into the
frontend build. Packaging fails if hosted mode has no origin.

The API's local default remains bound to `127.0.0.1`. Hosted mode requires a
configured Supabase account service and database; it does not expose local mode.

## 4. Configure confirmation and password reset URLs

After Render assigns the actual address, open Supabase **Authentication → URL
Configuration**. Replace the example address below with yours:

```text
Site URL: https://YOUR-SERVICE.onrender.com
Redirect URLs:
https://YOUR-SERVICE.onrender.com/?auth=callback#/login
https://YOUR-SERVICE.onrender.com/?auth=recovery#/reset-password
```

Keep the exact local development callback URLs if you still use local Recall.
Avoid broad redirect wildcards. Confirmation/recovery should be completed in the
browser where the request began, because the client uses PKCE. Signup and login
remain email/password only.

**Email delivery:** Supabase's default sender only delivers to project team
addresses and currently permits two emails per hour. It is suitable for testing
your own project email. Before inviting other people, configure **custom SMTP**
in Supabase Auth and verify confirmation and recovery using a non-team address.
A provider's sandbox/default sending domain may also restrict recipients; check
its requirements. Keep email confirmation enabled. See
[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and
[Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## 5. Install the hosted extension

1. Visit `/install-extension` on your Render website. Download the ZIP there;
   your source checkout's extension defaults to the local API.
2. Extract the ZIP to a folder and load that folder using Chrome's **Load
   unpacked**. Keep the folder for future reloads.
3. Refresh your LeetCode tabs after loading/reloading the extension.
4. Sign into extension Settings with the same confirmed Recall email/password
   as the website. Website login and extension login are separate.
5. Import accepted problems from the LeetCode account signed into that Chrome
   profile. Open the online dashboard and verify the imported count/placement.
6. Record a new accepted problem with required topic selection, reload the
   dashboard, and verify its coverage and practice evidence.

The hosted ZIP grants access only to LeetCode and this Recall origin. Its API and
website URLs both point to Render; no local API process is needed. Tokens remain
in Chrome session storage, while per-account drafts/checkpoints remain local.
The source extension still supports local development unchanged.

Optional later settings: `EXTENSION_VIDEO_URL` for your direct HTTPS walkthrough
video, and `EXTENSION_STORE_URL` for your Chrome Web Store listing. Change these
server settings and redeploy when ready. No store listing is required now.

## 6. Check before inviting anyone

Use accounts you create for testing, never someone else's account:

- Load `/`, `/about`, `/privacy`, `/signup`, `/login`, `/install-extension`
  directly and reload each. Check narrow layouts and both themes.
- Test confirmation/resend, login/logout and recovery. Test an address outside
  the Supabase project team once SMTP is configured.
- Complete setup, reload it, install the hosted extension and verify a real
  import and a new practice recording. Unknown import dates must stay unknown.
- Use two accounts to verify goals, imports, practice and exports remain separate.
- Download both a restorable **backup** and an **account export** in Workspace.
  An account export wraps setup/account details and is not a direct restore file.
- With a disposable test account, verify wrong-password deletion is rejected
  and confirmed deletion removes its Auth identity and private schema. Do not
  use your own practice account for this check.
- Open `/api/health` for process liveness. Signed-in `/api/ready` checks storage;
  a green liveness health check alone does not prove the database works.

Deletion first records a durable request and blocks late workspace requests. If
Auth or database cleanup fails, it resumes at startup and every five minutes
while the service runs. Free-service sleep delays retries. A minimal UUID/state
ledger remains to prevent recreation by stale requests; practice and notes are
removed. Provider backups and exports/extension drafts on other devices are
separate and are explained on the Privacy page.

## 7. Diagnose a workspace connection failure

The server runs a read-only `SELECT 1` at startup. In Render's service **Logs**,
look for `Recall database connection OK.` or `Recall database startup failed`.
Workspace requests and deletion recovery also log safe database codes. These
messages do not include passwords, connection strings, SQL, or account IDs.
The public `/api/health` endpoint remains a liveness check, not a database test.

- `28P01`: verify the **database** password and percent-encoding in DATABASE_URL.
- `POOLER_IDENTITY`: recopy the session pooler host and username from Connect;
  the username includes the project reference and the host cluster must match.
- `ENOTFOUND`: the database hostname cannot be resolved.
- `ETIMEDOUT` / `ENETUNREACH`: check database status and network restrictions;
  use the IPv4 session pooler on 5432.
- Certificate errors: configure the complete, current database CA PEM in
  DATABASE_CA_CERT; keep TLS verification enabled.
- `42501`: the database role cannot create the required workspace schemas/tables.

After changing Render environment variables, deploy the change and check the
new startup log. Share only the diagnostic line if you need help, not secrets.

## 8. Free-tier limits, backups and recovery

Render Free sleeps after 15 minutes without inbound traffic and may take about
a minute to wake. If the website/extension reports that Recall is waking up,
open the website, wait for it to load, then use **Retry connection** or retry the
operation. Existing request IDs and import checkpoints protect retries. Do not
add artificial traffic to bypass free-tier limits.

Use Supabase for PostgreSQL: Render's free PostgreSQL expires after 30 days.
Supabase Free currently includes 500 MB database storage and may pause inactive
projects after a week. Keep exports and monitor project capacity/activity; free
hosting is appropriate for a small preview, with no uptime guarantee. Check the
current [Render limits](https://render.com/docs/free) and
[Supabase plan](https://supabase.com/pricing) before expanding access.

Render's filesystem is not the database and should not hold backups. Keep
restorable per-account exports privately. Before a wider launch, decide and
document a database backup schedule, off-host encrypted storage and retention
period, test restoration into a separate database, and add a public support/
privacy contact. Do not assume the free plan includes managed backup recovery.
Review Render logs and Supabase Auth/database errors after deployments without
logging passwords, tokens or exported practice. The repository does not create
monitoring accounts or claim operational backup automation is configured.

To move local data, restore your downloaded local **backup** explicitly into
your own empty signed-in online workspace. It will not merge conflicting rows;
keep the original backup and verify counts afterwards.

## Later: custom domain and updates

Add your purchased domain in Render and follow its DNS/HTTPS instructions. Set
`APP_ORIGIN=https://your-domain.example`, update Supabase's Site URL and exact
redirects, then **rebuild and redeploy**. The rebuilt ZIP uses the new origin and
permission; users must replace/reload their unpacked extension from the new
download. The API accepts one configured website origin. Switching back requires
the same rebuild and redirect updates.

Official implementation references:
[Render environment variables](https://render.com/docs/environment-variables),
[Blueprint specification](https://render.com/docs/blueprint-spec),
[Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres),
[PostgreSQL TLS](https://node-postgres.com/features/ssl),
[Supabase admin deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser).
