# Recall — DSA practice strength

Recall shows which patterns have less practice or have been neglected. It leaves the study decision to you.

- Select Coverage to explore remaining goal gaps, or Retention to review weaker dated practice. The choice is remembered after reload and applies to category and subpattern ordering. Both metrics remain visible; undated prior solves and unpracticed patterns stay distinct from assessed retention.
- Independent subpattern bars with a persistent breadth/reinforcement baseline and a smaller recent-practice boost. The first dated recording cannot lower an undated experience score. Breadth is normalized by each pattern's scope.
- A pattern dashboard and detail screens with scoped problems, expandable history, and primary-pattern corrections. Desktop sidebars provide pattern navigation and goal context; smaller screens use a compact inline goal summary. There is no standalone library, global counter, or dashboard recording form.
- A compact LeetCode prompt after a fresh Accepted submission: assistance, one practiced approach, optional topic checkboxes, then Save practice. Manual recording remains available in the extension.
- Accepted-problem imports preserve existing practice and add legacy experience without inventing dates or assistance. Available recent dates initialize assessed bars. Reimport and retry live in extension Settings.

The Developer Arcade interface uses a dark Arcade Blue theme, full-width pattern rows, pattern and scoped problem search, and reduced-motion-aware transitions. Every row has a Practice strength bar. Legacy solves produce an experience-based bar while remaining clearly marked as date unknown. Ctrl/Cmd+K focuses pattern search. Design references and verification are documented in [.21st/DESIGN.md](.21st/DESIGN.md).

## Run

Use Node 22.13+ on the 22.x line, or Node 24+, and PostgreSQL. Configure DATABASE_URL in apps/api/.env using apps/api/.env.example. Keep the real file private.

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
```

Open http://127.0.0.1:5173. The API listens on 127.0.0.1:3001. Restart the API after backend changes; Vite reloads frontend edits. Startup does not apply migrations automatically.

Migration 006 snapshots existing attempt approaches conservatively and preserves assistance, dates, notes, and original tags. Applied migrations remain immutable. A problem's browsing placement cannot rewrite stored attempt approaches.

## Chrome extension

1. Open chrome://extensions, enable Developer mode, and Load unpacked from apps/extension in this project.
2. When updating, restart the API, reload the extension and refresh LeetCode. The current version is 0.8.0.
3. During setup, import previously accepted problems or skip. Keep a signed-in LeetCode tab and the local API available.
4. After a new Accepted result, record practice in the small prompt. A successful save closes it; failed saves retain the same recording for retry.
5. Open extension Settings to resume, reimport, or retry available recent dates. These actions do not appear on the dashboard.

The extension uses the LeetCode account signed in to the website, not Chrome sync. Credentials remain on LeetCode. One local workspace belongs to one LeetCode account; changing accounts is rejected during imports and new recordings. Recent submission availability is limited and is not a complete historical timeline.

Problem history now supports editing, soft removal, notes, earlier recordings, filters and sorting. Workspace Settings shows the database/account, exports a JSON backup, restores compatible missing records without overwriting conflicts, and restores removed recordings. Back up before moving or rebuilding your database; restore requires the same migration version.

The recording panel keeps editable choices when closed and freezes uncertain saves for identical retries. Additional Accepted submissions are queued. Extension Settings lists drafts, pending saves, queued submissions and archived conflict choices. Manual dates use labelled browser time; the dashboard and scoring use Asia/Calcutta.

## Validation

```powershell
npm.cmd run check
npm.cmd run test:db
npm.cmd run test:capture
```

check runs lint, database-independent tests, and the production build. test:db creates isolated temporary schemas and tests persistence, migration backfill, imports, corrections, and practice strength. Set TEST_DATABASE_URL to use a separate database if desired. test:capture serves a mock browser fixture on port 8765 without writing practice data.

The stack is JavaScript React/Vite/Material UI, Express, PostgreSQL with pg/raw SQL, and Chrome MV3. This remains a local personal app without accounts or deployment.

See [architecture](docs/architecture.md), [strength policy](docs/retention.md), [API](docs/api.md), [extension recording](docs/extension-recording.md), [legacy import](docs/legacy-import.md), and [testing](docs/testing.md).
