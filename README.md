# Recall — DSA practice tracker

Recall connects a pattern-focused dashboard, coverage goals, estimated practice strength and a Chrome extension. Public Home/About, email/password accounts, short setup, extension installation and privacy/data controls are implemented. See [public-site phases](docs/public-site.md) and [.21st/DESIGN.md](.21st/DESIGN.md).

For a hosted preview without buying a domain, follow [Render + Supabase setup](docs/deploy-render.md). Deployment is prepared but has not been published automatically.

The API, PostgreSQL practice data, coverage and retention policies, and Chrome extension remain available.

## Run

Use Node 22.13+ on the 22.x line, or Node 24+, and PostgreSQL. Configure DATABASE_URL in apps/api/.env using apps/api/.env.example. Keep the real file private.

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
```

Open http://127.0.0.1:5173. The API listens on 127.0.0.1:3001. Restart the API after backend changes; Vite reloads frontend edits. Local mode uses explicit migrations; verified account workspaces migrate on first access. See [Supabase accounts](docs/account-setup.md) for email login configuration.

Migration 006 snapshots existing attempt approaches conservatively and preserves assistance, dates, notes, and original tags. Applied migrations remain immutable. A problem's browsing placement cannot rewrite stored attempt approaches.

## Chrome extension

1. Open chrome://extensions, enable Developer mode, and Load unpacked from apps/extension in this project.
2. When updating, restart the API, reload the extension and refresh LeetCode. The current version is 0.10.1.
3. During setup, import previously accepted problems or skip. Keep a signed-in LeetCode tab and the local API available.
4. After a new Accepted result, record practice in the small prompt. A successful save closes it; failed saves retain the same recording for retry.
5. Open extension Settings to resume, reimport, or retry available recent dates. These actions remain available through the extension.

The extension uses the LeetCode account signed in to the website, not Chrome sync. Credentials remain on LeetCode. One local workspace belongs to one LeetCode account; changing accounts is rejected during imports and new recordings. Recent submission availability is limited and is not a complete historical timeline.

The API supports history editing, soft removal, notes, earlier recordings, filters and sorting. Workspace provides JSON backups, compatible missing-record restore, removed-record recovery and account data controls. A separate History page is intentionally absent. Back up before moving or rebuilding your database; restore requires the same migration version.

The recording panel keeps editable choices when closed and freezes uncertain saves for identical retries. Additional Accepted submissions are queued. Extension Settings lists drafts, pending saves, queued submissions and archived conflict choices. Topics used is required, with a searchable Other picker. Practice timestamps are recorded internally; API scoring uses Asia/Calcutta.

## Validation

```powershell
npm.cmd run check
npm.cmd run test:db
npm.cmd run test:capture
```

check runs lint, database-independent tests, and the production build. test:db creates isolated temporary schemas and tests persistence, migration backfill, imports, corrections, and practice strength. Set TEST_DATABASE_URL to use a separate database if desired. test:capture serves a mock browser fixture on port 8765 without writing practice data.

The stack is JavaScript React/Vite, Express, PostgreSQL with pg/raw SQL, Supabase Auth, and Chrome MV3. Local mode remains available; hosted mode requires verified accounts and the Render/Supabase configuration.

See [architecture](docs/architecture.md), [strength policy](docs/retention.md), [API](docs/api.md), [extension recording](docs/extension-recording.md), [legacy import](docs/legacy-import.md), and [testing](docs/testing.md).
