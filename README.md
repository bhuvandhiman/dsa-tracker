# Recall

Recall is a pattern-first DSA practice workspace. It organizes accepted LeetCode
problems into an explainable pattern catalog, shows which coverage gaps matter
for the selected goal, and records what the learner actually practiced so that
the next recommendation can reflect both interview focus and durable practice.

The product's main question is: **which DSA pattern should I work on next, and
why?** Recall is not just a lifetime solved counter, a calendar streak, or a
claim that it can measure a person's memory perfectly. Its practice-strength
and priority values are transparent product heuristics; imported historical
solves are useful coverage evidence but do not become invented practice dates or
independent recall.

## Product decisions and mental model

- **Patterns are the main product.** The ordered patterns page and its inline
  subpattern/problem details make the recommendation inspectable and actionable.
- **Coverage and practice strength are distinct signals shown together.** Goal
  coverage is divided by Easy, Medium, and Hard. Pattern practice strength
  combines breadth, repeat practice, and dated recency. Neither is a substitute
  for the other.
- **Classification must be trustworthy.** Preserve LeetCode's raw topics, prefer
  specific technique evidence, use reviewed identity mappings only where the
  provider has a vocabulary gap, and give every problem one primary placement.
- **One solve should not make a pattern jump around.** Small coverage changes
  count immediately, while committed queue movement waits for meaningful
  coverage or practice blocks. This reduces distracting back-and-forth.
- **Do not invent certainty.** Unknown dates remain unknown; strength is not a
  calibrated probability of future recall; the queue is a recommendation, not a
  guarantee.

The complete rationale and decisions—including ideas that changed during
discussion—are in [Product brief](docs/product-brief.md) and the
[decision record](docs/product-decisions.md). Start with the
[documentation index](docs/index.md). For current scoring details, see
[pattern progress and strength](docs/retention.md); research limitations and
future measurement requirements are in [retention research](docs/retention-research.md).

## What is in the repo

| Part | Location | Responsibility |
| --- | --- | --- |
| Website | `apps/web` | Public home/about/privacy pages, email account flows, onboarding, dashboard, pattern details, connection/import controls, settings and account tools. |
| API | `apps/api` | Express API, PostgreSQL persistence, goal and practice policies, account isolation, imports, backup/restore, and owner operations. |
| Chrome extension | `apps/extension` | Detects accepted LeetCode submissions, records confirmed practice, imports accepted problems and recent dates, and connects to the Recall website. |
| Shared definitions | `apps/shared` | Settings and limits used by more than one package. |
| Product and engineering docs | `docs` | Product rationale, domain rules, current contracts, test/deploy guides, and dated historical audits. |

This is an npm-workspaces monorepo using React/Vite, Express, PostgreSQL through
`pg`, Supabase Auth for hosted email/password accounts, and a Manifest V3
Chrome extension. [Architecture](docs/architecture.md) explains the system;
[codebase map](docs/codebase-map.md) describes each source, test, and migration
file.

## Run locally

Use Node 22.13+ on the 22.x line or Node 24+, plus PostgreSQL. The local API
defaults to loopback only. Configure `DATABASE_URL` in `apps/api/.env` using
[`apps/api/.env.example`](apps/api/.env.example). Keep real `.env` files,
passwords, and Supabase server keys out of source control and chat.

In PowerShell:

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
```

Open <http://127.0.0.1:5173>. Vite serves the website and forwards `/api` to the
API at <http://127.0.0.1:3001>. `npm run dev` starts both. `AUTH_MODE=local` is
the default and keeps the local single-workspace behavior. Email/password
accounts use `AUTH_MODE=supabase`; see [account setup](docs/account-setup.md).

## Chrome extension

For local development:

1. Run the local API and website.
2. Open `chrome://extensions`, enable **Developer mode**, and choose **Load
   unpacked** for the repository's `apps/extension` folder.
3. Reload Recall in Chrome and refresh the LeetCode tab after reloading the
   extension.
4. Keep a LeetCode tab signed into the account you want to import. Use Recall's
   **Connect LeetCode** flow to import accepted problems or record a new
   accepted attempt.

For a hosted install, download the ZIP from Recall's `/install-extension` page.
The package script writes the configured website/API origin and matching Chrome
host permission into the ZIP. The extension is currently distributed as a ZIP
for **Load unpacked**; a Chrome Web Store URL and walkthrough video are optional
future settings. See [extension setup and connection](docs/website-extension-login.md),
[import behavior](docs/legacy-import.md), and the [Render runbook](docs/deploy-render.md).

The extension does not read or upload the learner's solution source code. A
practice record contains problem identity/metadata, the learner's assistance
choice, selected topics/pattern, optional notes, and capture/import evidence.
LeetCode session credentials remain in the signed-in browser. In hosted mode,
the website sends the extension a short-lived access token; it does not send the
website password or refresh token to the extension.

## Checks and specialized workflows

```powershell
npm.cmd run check
npm.cmd run test:db
npm.cmd run test:capture
npm.cmd run test:extension-ui
npm.cmd run test:website-import
npm.cmd run test:accounts
```

`npm run check` runs ESLint, the database-independent Node test suite, and the
production website build. Database integration checks need a configured test
database and create isolated test schemas. Do not aim them at a workspace whose
practice data you care about. The specialized scripts use local fixtures for
extension capture, account screens, and website-to-extension imports. Exact
coverage and caveats are in [testing](docs/testing.md).

## Hosted preview

The current deployment target is one Render Node service serving both the
website and API, with Supabase providing email/password Auth and PostgreSQL.
The free `onrender.com` address is adequate for a preview; no domain purchase is
required now. `render.yaml` has `autoDeployTrigger: "off"`, so updates require a
manual Render deployment after the code is committed and pushed. Follow the
[Render + Supabase guide](docs/deploy-render.md). Do not commit or paste
`DATABASE_URL`, `DATABASE_CA_CERT`, `SUPABASE_SECRET_KEY`, or real credentials.

## Current-state caveats

- The current UI has a `#/history` route and navigation entry. This conflicts
  with your earlier decision to remove the standalone History page. See the
  [decision record](docs/product-decisions.md); the documentation task records
  the mismatch without changing the app.
- Reports with dates in their filenames are point-in-time audits or phase
  notes. They explain how a decision evolved; they are not the current behavior
  contract unless the documentation index says otherwise.
- Goal weights, practice-strength curves, thresholds, and hold durations are
  Recall policy choices, not empirically calibrated DSA-memory probabilities.
