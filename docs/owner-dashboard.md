# Owner dashboard operations

The dashboard is at `/#/owner` (direct `/owner` routes also work). Only accounts in the server’s `recall_operations.owners` table receive the account-menu link. Every owner API read checks that registry afresh, verifies the exact bearer with Supabase, and requires `aal2`, a currently verified TOTP factor, and a TOTP verification within 15 minutes. Browser metadata is never used for privileges. Local mode has no owner dashboard.

## First owner

Use the intended production database and Supabase project. Configure `AUTH_MODE=supabase`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and the **server-only** `SUPABASE_SECRET_KEY` in `apps/api/.env` or server environment. Enable TOTP MFA in Supabase Auth. Never put the secret in a `VITE_` variable, browser or extension.

Find your account’s immutable UUID in Supabase Authentication → Users. Run from the repository root:

```powershell
npm run owner -- grant YOUR-SUPABASE-USER-UUID
npm run owner -- sync
```

Grant validates the account against Supabase and requires a verified email. It creates the protected operations schema and records the grant in the audit log. There is no automatic first-user promotion. Sign out and back in to refresh the account-menu link. Open Owner dashboard, set up your authenticator, then enter its six-digit code. Store access to the authenticator securely.

Default permissions are overview, masked account summaries, diagnostics, health and audit reads. If an operator explicitly needs full contact emails for support:

```powershell
npm run owner -- grant YOUR-SUPABASE-USER-UUID --allow-contact
```

This extra permission still requires MFA and a support reason for each reveal; the audit write and reveal share a transaction. Repeat `grant` without that flag to remove contact permission. To revoke all owner access immediately:

```powershell
npm run owner -- revoke YOUR-SUPABASE-USER-UUID
```

Roles cannot be granted or changed through the dashboard. It does not suspend/delete other users, edit practice, impersonate accounts, or display secrets.

## Data and scaling

Directory sync paginates Supabase’s admin API in batches of 100 and reads **counts only** from existing workspaces; it never creates or migrates someone else’s workspace. Run it initially and when a complete current signup directory is needed. A partial/failed sync is not marked complete. Until the first successful sync, totals are explicitly labeled observed accounts. Unverified accounts that have never opened a verified session appear after directory sync. Existing records update when accounts open a session, change setup/profile, open practice/history, or save/import/correct data. Last activity uses server received time, not historical imported solve dates. Summary values may be unavailable for an account without a workspace.

The owner UI loads only the selected view, uses paginated directories/logs, and has manual refresh. It does not poll. Practice API responses enqueue bounded operational updates; collection failures never fail a confirmed save. Pending observations coalesce per account. Owner reads wait up to one second for pending observations, so an active collection queue cannot block the dashboard indefinitely. API timings are aggregated into hourly buckets and flushed with one bulk database write on the server once per minute or before an owner read. Health shows collection failures and dropped observations; success counts are operational observations rather than a billing ledger. Each API instance supplies its own live pool/uptime status; persisted buckets combine instances sharing the database.

Diagnostics distinguish server-confirmed new captures/import batches from client reports. Import retries adding zero rows are not counted as new successful batches. Extension versions are client reported; a verified connection timestamp is a past observation, not current installation/online proof. Updated extension 0.15.0 reports its version on the existing connect request. Older extension connections may have an unknown version.

The private schema revokes public, `anon` and `authenticated` access and enables RLS without public policies. Keep it outside Supabase’s exposed API schemas. The API database credential must own this schema or have the required migration privileges; do not grant browser roles database access. Account deletion purges operational identity/diagnostics and owner grants, retaining minimal security IDs. The same cleanup runs on queued deletion recovery. Diagnostics/API buckets expire after 30 days, owner audit entries after 90 days, with server-side daily cleanup.

## MFA recovery and troubleshooting

An ordinary password reset does not bypass owner MFA. If the authenticator is lost, a trusted Supabase project operator must verify the owner identity out of band, revoke Recall owner access, recover/remove the factor using Supabase’s secure administrative tools, then explicitly grant owner access again and enroll a new authenticator. Record the reason in your incident records; never implement a public recovery bypass.

If owner reads fail, inspect the database and Supabase configuration. A liveness response from `/api/health` only means Node is responding. The protected System health view performs a real database query and shows authentication/database/API response timings. Request IDs are returned in `X-Recall-Request-ID`; collection never records request bodies, tokens or raw provider errors. Run `npm run owner -- sync` to refresh directory snapshots. No application role is assigned by editing `user_metadata` or matching an email address.
