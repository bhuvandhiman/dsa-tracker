# Recall — DSA practice / retention tracker

JavaScript monorepo: React + Vite + Material UI, Express 5, PostgreSQL through pg/raw SQL, and a Chrome Manifest V3 extension.

## Current phase

Phase 6 adds a recording prompt after a newly accepted LeetCode submission, plus title and detection-time prefill. Detection is conservative and depends on LeetCode markup. Saving remains explicit. See the [Phase 6 capture walkthrough](docs/phase-6.md), including the remaining live Chrome check.

The review queue schedules problems after 1 day for solution help, 3 days for hints, or 7 days for an independent solve. These are starter intervals, not retention scores.

The dashboard records attempts and shows paginated history. Interrupted saves can be retried without duplicates, including after a reload in the same tab. The extension can offer a reminder after acceptance and opens the dashboard with the problem filled in. It never saves automatically.

See the [Phase 5 review walkthrough](docs/phase-5.md) for scheduling rules and usage. See the [Phase 4 extension walkthrough](docs/phase-4.md) for the complete workflow and Chrome verification checklist.

## Run locally

Use Node 22.13+ on the 22.x line or Node 24+, with npm. On Windows, `npm.cmd` avoids PowerShell launcher issues.

```powershell
cd "C:\Users\bhuva\Documents\Projects\dsa-tracker"
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173. With PostgreSQL configured and migrated, the dashboard should show the attempt form and practice history. Without PostgreSQL, health works and data routes return an explicit 503 setup error.

Ctrl+C stops the apps. Frontend edits reload automatically. Restart the combined command after API edits, or use `npm.cmd run dev:api` and `npm.cmd run dev:web` in separate terminals for API file watching.

## Enable PostgreSQL storage

1. Install PostgreSQL and create an empty database named `dsa_tracker`.
2. Copy `apps/api/.env.example` to `apps/api/.env` if that file does not already exist.
3. Set DATABASE_URL to your local database connection string, including your own password. URL-encode reserved characters in the password. Never commit the real .env file.
4. Run:

```powershell
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run test:db
npm.cmd run dev
```

Migrations are explicit: startup never changes the schema. The migration command creates the initial tables and 15 starter patterns. Rerunning it is safe; editing an already-applied migration is rejected. Add a new SQL migration when the schema changes.

`test:db` requires permission to create a temporary schema in the configured database. It uses an isolated, randomly named schema and removes only that schema afterward. Set TEST_DATABASE_URL to a separate test database if desired.

This phase is a single local workspace without accounts. User ownership and authentication must be added before multi-user deployment.

See [Phase 3 dashboard walkthrough](docs/phase-3.md) to record your first attempt. See [Phase 2 walkthrough](docs/phase-2.md) for exact PowerShell examples to add a problem, record/retry attempts, and import historical solves.

## Load the extension

1. Open `chrome://extensions` in Chrome and enable Developer mode.
2. Click Load unpacked and choose `C:\Users\bhuva\Documents\Projects\dsa-tracker\apps\extension`.
3. Open https://leetcode.com/problems/two-sum/ and refresh the tab after loading/reloading the extension.
4. Open Recall from the Extensions menu. Expect “Extension loaded · v0.3.0” and “two-sum”.
5. Click Record this problem to open the dashboard. Review the suggested title, choose assistance and practiced patterns, then save.
6. When updating an existing installation, reload the extension and refresh the LeetCode tab.

No extension build is needed. It runs only on https://leetcode.com/* and requests no broad tab, storage, or API host permissions. Other sites show guidance. If an old copy is loaded from the Codex output directory, replace that entry with this Projects copy.

## Commands

| Command | Purpose |
| --- | --- |
| npm.cmd run dev | Start API and dashboard |
| npm.cmd run dev:api / dev:web | Start either app separately |
| npm.cmd run check | Lint, 99 database-independent tests, dashboard build |
| npm.cmd run test:capture | Serve the controlled capture fixture on port 8765 |
| npm.cmd test | Run database-independent tests |
| npm.cmd run test:db | Explicit PostgreSQL integration suite |
| npm.cmd run db:check | Check PostgreSQL connectivity |
| npm.cmd run db:migrate | Apply pending SQL migrations |
| npm.cmd run build | Build apps/web/dist |
| npm.cmd run start:api | Run API without watching |
| npm.cmd run preview --workspace=@dsa/web | Preview built dashboard on port 4173, with API running |

The default test suite remains runnable without a database. Passing it does not establish that PostgreSQL migrations or persistence have been verified; run test:db for those.

## Structure and design

- apps/web: attempt form, practice history, and API client; relative /api calls go through the Vite proxy.
- apps/api/src/domain.js: plain JavaScript input validation.
- apps/api/src/platforms: platform-specific identity parsing, currently LeetCode only.
- apps/api/src/repository.js: parameterized SQL and transaction boundaries.
- apps/api/migrations: versioned SQL schema and seed data.
- apps/extension: manifest, popup, worker, content script, LeetCode adapter.
- tests: HTTP, validation, extension, process, and optional PostgreSQL checks.
- docs: architecture, API contracts, testing, and walkthrough.

Read [architecture](docs/architecture.md), [API contracts](docs/api.md), and [testing notes](docs/testing.md).

## Troubleshooting

- API offline: start the API and verify port 3001.
- Data route returns 503: configure DATABASE_URL, start PostgreSQL, and run db:migrate.
- API port changed: set API_PROXY_TARGET in apps/web/.env to the same port; restart Vite.
- Port occupied: stop the other local process. Vite intentionally does not silently change ports.
- Extension cannot see the problem: reload the extension and refresh the LeetCode tab.
- npm launcher broken: use `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev`.

No TypeScript, Next.js, NestJS, ORM, Redis, Docker, auth, scoring, or deployment has been added.

