# Codebase map

This map covers the checked-in application, build, test, migration, and product
documentation files. It is intended to answer “where should I look?” without
having to infer ownership from names alone. Generated dependencies, Git object
storage, ignored local environment files, and temporary logs are not source
files and are intentionally omitted.

For design rationale use [product brief](product-brief.md) and
[decision record](product-decisions.md). For the data and counts, use
[data model](data-model.md). For cross-process flow, use
[architecture](architecture.md).

## Repository root

| File | Responsibility |
| --- | --- |
| [`package.json`](../package.json) | npm workspace definition and developer commands (`dev`, build, checks, fixtures, DB tests, extension packaging, owner bootstrap). |
| [`package-lock.json`](../package-lock.json) | Exact dependency resolution for reproducible `npm ci`; update with intentional dependency changes. |
| [`.nvmrc`](../.nvmrc) | Node version selected by local tooling. |
| [`.editorconfig`](../.editorconfig) | Shared editor whitespace/newline conventions. |
| [`.gitignore`](../.gitignore) | Excludes local secrets, generated build output, dependencies and temporary data from version control. |
| [`eslint.config.js`](../eslint.config.js) | JavaScript/JSX lint rules used by `npm run lint` and `npm run check`. |
| [`.stylelintrc.json`](../.stylelintrc.json) | Stylelint configuration for CSS style checks when invoked. |
| [`render.yaml`](../render.yaml) | Render Blueprint for one hosted Node service. Auto-deploy is intentionally off; secret environment values are supplied in Render, not committed here. |
| [`README.md`](../README.md) | Short product overview, local run, extension setup, checks, and documentation entry point. |
| [`design.json`](../.21st/design.json) | 21st.dev project context: design tokens, component/source file references, stack, and the visual instruction file. |
| [`DESIGN.md`](../.21st/DESIGN.md) | Chronological visual and UI decision journal. Later entries can supersede earlier phases; consult the current product brief for today's intended direction. |

## Shared definitions — `apps/shared`

| File | Responsibility |
| --- | --- |
| [`profile.js`](../apps/shared/profile.js) | Normalizes and validates the user-selected Recall display name. |
| [`backup-limits.js`](../apps/shared/backup-limits.js) | Shared backup size/validation bounds for API and browser restore. |
| [`design-tokens.json`](../apps/shared/design-tokens.json) | Canonical shared palette/type/spacing tokens from the chosen Recall visual direction. |

## API — `apps/api`

### Package, configuration, and database evolution

| File | Responsibility |
| --- | --- |
| [`package.json`](../apps/api/package.json) | API start/dev, DB check and migration scripts; Express and `pg` runtime dependencies. |
| [`.env.example`](../apps/api/.env.example) | Safe local configuration template. Copy it to `.env` and replace placeholders; never commit the real file. |
| [`migrations/001_domain.sql`](../apps/api/migrations/001_domain.sql) | Base patterns, problems, problem-pattern links, attempts, attempt-pattern links, historical solves and initial catalog. |
| [`migrations/002_attempt_corrections.sql`](../apps/api/migrations/002_attempt_corrections.sql) | Adds optimistic attempt revisions and soft deletion. |
| [`migrations/003_extension_capture.sql`](../apps/api/migrations/003_extension_capture.sql) | Adds attempt pattern provenance and the initial extended pattern vocabulary. |
| [`migrations/004_legacy_imports.sql`](../apps/api/migrations/004_legacy_imports.sql) | Adds durable legacy accepted-problem import run state. |
| [`migrations/005_retention.sql`](../apps/api/migrations/005_retention.sql) | Adds early retention preferences, manual placement rows, recent import runs and imported submissions. |
| [`migrations/006_practice_strength.sql`](../apps/api/migrations/006_practice_strength.sql) | Adds attempt practice-unit/source/topics/submission evidence and binds the local workspace to a LeetCode username. |
| [`migrations/007_goal_coverage.sql`](../apps/api/migrations/007_goal_coverage.sql) | Adds the selected goal profile/target/policy version for the workspace. |
| [`migrations/008_provider_topic_specificity.sql`](../apps/api/migrations/008_provider_topic_specificity.sql) | Adds specialized tree/graph/DP provider patterns such as DFS, BFS, Segment Tree, Topological Sort and Shortest Path. |
| [`migrations/009_hash_table_specificity.sql`](../apps/api/migrations/009_hash_table_specificity.sql) | Adds the distinct Hash Table provider pattern. |
| [`migrations/010_provider_topic_metadata.sql`](../apps/api/migrations/010_provider_topic_metadata.sql) | Adds nullable raw provider-topic JSON and verifies that it is an array. |
| [`migrations/011_queue_snapshot.sql`](../apps/api/migrations/011_queue_snapshot.sql) | Adds derived queue snapshot storage to workspace goal; original evidence remains the source of truth. |

Applied migrations must remain immutable. If a schema change is needed, add a
new numbered migration and verify both fresh installation and upgrade.

### API source modules

| File | Responsibility |
| --- | --- |
| [`src/server.js`](../apps/api/src/server.js) | Process entry point: validates port/host/deployment/auth, builds the pool and repositories, mounts the app, starts recovery/flush timers, checks DB connectivity, and handles graceful shutdown. |
| [`src/app.js`](../apps/api/src/app.js) | Express composition: host/origin and security headers, JSON limits, public config/health, extension auth, private account/setup/data dispatch, hosted static serving, safe errors and 404s. |
| [`src/data-routes.js`](../apps/api/src/data-routes.js) | Validates and dispatches pattern, problem, practice, history, import, backup and goal endpoints. |
| [`src/domain.js`](../apps/api/src/domain.js) | Domain error type and strict parsers for IDs, URLs, difficulties, attempts, topics, capture payloads, goals, pagination and corrections. |
| [`src/repository.js`](../apps/api/src/repository.js) | SQL persistence and transactional business behavior: import, capture, correction, library, history, backups, coverage and retention response assembly. |
| [`src/db.js`](../apps/api/src/db.js) | PostgreSQL pool creation, TLS and connection-string policy. |
| [`src/transaction.js`](../apps/api/src/transaction.js) | Shared transaction wrapper, isolation/read-only support, rollback and cleanup. |
| [`src/migrations.js`](../apps/api/src/migrations.js) | Discovers/applies migrations once per schema using migration tracking and lock discipline. |
| [`src/migrate.js`](../apps/api/src/migrate.js) | CLI entry point for explicitly migrating the local database. |
| [`src/check-db.js`](../apps/api/src/check-db.js) | CLI readiness/connection check for local PostgreSQL configuration. |
| [`src/database-diagnostics.js`](../apps/api/src/database-diagnostics.js) | Converts database failures to safe diagnostic codes/messages without logging secret values. |
| [`src/deployment.js`](../apps/api/src/deployment.js) | Validates local versus hosted settings, public origin, HTTPS requirements and deployment trust boundary. |
| [`src/auth.js`](../apps/api/src/auth.js) | Validates Supabase environment and verifies bearer sessions against Supabase Auth. |
| [`src/extension-auth.js`](../apps/api/src/extension-auth.js) | Extension login/refresh/website-token verification; keeps passwords transient and validates returned sessions. |
| [`src/account-profile.js`](../apps/api/src/account-profile.js) | Profile allowlist validation and Supabase Auth profile update/setup normalization. |
| [`src/user-workspaces.js`](../apps/api/src/user-workspaces.js) | Derives safe UUID-scoped schemas, initializes/migrates per-user workspace, sets/resets search path, and adds onboarding state. |
| [`src/account-lifecycle.js`](../apps/api/src/account-lifecycle.js) | Durable account deletion workflow, auth identity removal, workspace cleanup, lock/lease and retry recovery. |
| [`src/backup.js`](../apps/api/src/backup.js) | Serializes and validates workspace backup records and performs compatible atomic restore. |
| [`src/goal-policy.js`](../apps/api/src/goal-policy.js) | Goal profiles, category/subpattern/difficulty quotas, actual-vs-credited coverage, focus emphasis and stable priority queue logic. |
| [`src/practice-policy.js`](../apps/api/src/practice-policy.js) | Tunable constants for weighted practice blocks, distinct-problem threshold and queue buffer bands. |
| [`src/retention-policy.js`](../apps/api/src/retention-policy.js) | Breadth/reinforcement/recency calculations, day deduplication, holds, per-unit/category summaries and initial unconfigured ranking. |
| [`src/pattern-catalog.js`](../apps/api/src/pattern-catalog.js) | Canonical category/subpattern list, reviewed identity rules, provider candidate precedence, placement units and primary classification. |
| [`src/platforms/leetcode-topics.js`](../apps/api/src/platforms/leetcode-topics.js) | Maps/normalizes LeetCode topic vocabulary while retaining unknown topics as unknown metadata. |
| [`src/platforms/leetcode.js`](../apps/api/src/platforms/leetcode.js) | Parses and validates supported LeetCode problem URLs/identities. |
| [`src/problem-scope.js`](../apps/api/src/problem-scope.js) | Determines which imported records belong in Recall's DSA-tracked scope. |
| [`src/import-bulk.js`](../apps/api/src/import-bulk.js) | Deduplicates each incoming batch, performs bulk problem/pattern upserts and inserts/validates recent submission evidence. |
| [`src/request-metrics.js`](../apps/api/src/request-metrics.js) | Instruments selected request stages/DB pool operations and emits bounded operational summaries. |
| [`src/owner-policy.js`](../apps/api/src/owner-policy.js) | Owner permission names, identifier/page validation, email masking and MFA requirement checks. |
| [`src/owner-store.js`](../apps/api/src/owner-store.js) | Separate operational schema for owner grants, service summaries, sanitized diagnostics and audit events. |
| [`src/owner-operations.js`](../apps/api/src/owner-operations.js) | Batches activity/health/diagnostic observations for the owner dashboard; failures do not block practice storage. |
| [`src/owner-sync.js`](../apps/api/src/owner-sync.js) | Controlled synchronization of Auth account metadata into privacy-limited owner summaries. |
| [`src/owner-routes.js`](../apps/api/src/owner-routes.js) | MFA- and permission-protected owner-only HTTP routes. |

## Website — `apps/web`

### Build and shell

| File | Responsibility |
| --- | --- |
| [`package.json`](../apps/web/package.json) | React, React DOM, Supabase JS and Vite package scripts. |
| [`.env.example`](../apps/web/.env.example) | Frontend-safe local configuration template; browser variables must never include Supabase secret keys. |
| [`index.html`](../apps/web/index.html) | Vite document entry and visible pre-React startup message if the JavaScript bundle fails before mount. |
| [`vite.config.js`](../apps/web/vite.config.js) | React plugin and local `/api` proxy configuration. |
| [`src/main.jsx`](../apps/web/src/main.jsx) | React root mount. |
| [`src/App.jsx`](../apps/web/src/App.jsx) | Hash-route shell, navigation, auth/setup guards, theme toggle, error boundary and page composition. |
| [`src/navigation.js`](../apps/web/src/navigation.js) | Parses/creates hash destinations, pattern links, and auth callback navigation. |
| [`src/ErrorBoundary.jsx`](../apps/web/src/ErrorBoundary.jsx) | Catches React render errors and presents a retry/recovery state instead of crashing silently. |
| [`src/LazyPage.jsx`](../apps/web/src/LazyPage.jsx) | Loading/error wrapper for lazy-loaded settings/profile/owner pages. |
| [`src/styles.css`](../apps/web/src/styles.css) | Authenticated workspace, dashboard, pattern rows, problem lists, controls and responsive application styles. |
| [`src/public.css`](../apps/web/src/public.css) | Public home/about/privacy/install/auth page visual system and responsive styles. |
| [`src/tokens.css`](../apps/web/src/tokens.css) | Imports/defines design token variables used by shared and domain UI primitives. |
| [`src/accounts.css`](../apps/web/src/accounts.css) | Signup/login/reset/setup layouts and form styling. |

### Website authentication, privacy and navigation

| File | Responsibility |
| --- | --- |
| [`src/AuthPages.jsx`](../apps/web/src/AuthPages.jsx) | Signup, login, email confirmation/resend, forgot password, reset password and error feedback UI. |
| [`src/auth-client.js`](../apps/web/src/auth-client.js) | Supabase browser client creation and safe no-auth/local behavior. |
| [`src/use-auth.js`](../apps/web/src/use-auth.js) | React hook for auth config, session, setup/profile, login, signup, reset, logout and retry. |
| [`src/auth-feedback.js`](../apps/web/src/auth-feedback.js) | Maps provider/status errors into user-facing messages. |
| [`src/auth-cooldowns.js`](../apps/web/src/auth-cooldowns.js) | Browser-side cooldown state for resend/retry behavior. |
| [`src/auth-navigation.js`](../apps/web/src/auth-navigation.js) | Stores destination across auth, sanitizes destinations, and recovers callback navigation. |
| [`src/api.js`](../apps/web/src/api.js) | Fetch wrapper for JSON API, auth/workspace headers, errors, timeouts and request settings. |
| [`src/extension-bridge.js`](../apps/web/src/extension-bridge.js) | Same-origin website-to-extension message protocol, nonce/request handling, access-token publish and practice-change notifications. |
| [`src/use-extension.js`](../apps/web/src/use-extension.js) | React hook for extension detection, connection state, setup/import requests and change notifications. |
| [`src/Privacy.jsx`](../apps/web/src/Privacy.jsx) | Human-readable account and data-control explanation. |
| [`src/AccountControls.jsx`](../apps/web/src/AccountControls.jsx) | User data export, backup/restore, removed-record recovery and account deletion controls. |
| [`src/AccountMenu.jsx`](../apps/web/src/AccountMenu.jsx) | Signed-in account menu, workspace navigation and logout action. |
| [`src/SupportLink.jsx`](../apps/web/src/SupportLink.jsx) | Shared support/contact link behavior. |

### Public pages and setup

| File | Responsibility |
| --- | --- |
| [`src/PublicPages.jsx`](../apps/web/src/PublicPages.jsx) | Public home/about and installation-page content, extension ZIP/video/store link presentation. |
| [`src/Onboarding.jsx`](../apps/web/src/Onboarding.jsx) | Short signed-in setup and extension-installation instruction screens. |
| [`src/installation-model.js`](../apps/web/src/installation-model.js) | Normalizes extension installation URLs/status and optional video/store availability. |
| [`src/Connection.jsx`](../apps/web/src/Connection.jsx) | Website connection/import hub showing actual extension/LeetCode/import status and actions. |

### Dashboard and pattern details

| File | Responsibility |
| --- | --- |
| [`src/LiveDashboard.jsx`](../apps/web/src/LiveDashboard.jsx) | Loads the retention/goals snapshot; composes dashboard, pattern index, pattern details, goal form and refresh/error states. |
| [`src/PatternOverview.jsx`](../apps/web/src/PatternOverview.jsx) | Main retention tracker and segmented Easy/Medium/Hard coverage bars with keyboard/touch explanations. |
| [`src/PatternMetrics.jsx`](../apps/web/src/PatternMetrics.jsx) | Practice/retention bar, focus badges/legend, next-action marker and accessible metric explanations. |
| [`src/PatternMenu.jsx`](../apps/web/src/PatternMenu.jsx) | Per-problem overflow actions for primary classification correction and catalog search. |
| [`src/SubpatternProblems.jsx`](../apps/web/src/SubpatternProblems.jsx) | Expand/collapse subpattern rows, query its problems, sort, open LeetCode links and expose problem actions. |
| [`src/NextPractice.jsx`](../apps/web/src/NextPractice.jsx) | First recommended practice destination and contextual action. |
| [`src/dashboard-model.js`](../apps/web/src/dashboard-model.js) | Client-side presentation helpers: preserve API order, filter names, classify counts, derive bar segments and explanation labels. |
| [`src/practice-cache.js`](../apps/web/src/practice-cache.js) | In-memory practice snapshot cache and invalidation/subscription when a confirmed extension save happens. |
| [`src/session-loader.js`](../apps/web/src/session-loader.js) | Shared workspace/session loading behavior for private screens. |
| [`src/workspace-context.js`](../apps/web/src/workspace-context.js) | React workspace identity/request context so components use the correct authenticated account. |
| [`src/date-format.js`](../apps/web/src/date-format.js) | Formats practice dates consistently in the product's declared timezone. |
| [`src/History.jsx`](../apps/web/src/History.jsx) | Current dated solve-history screen. Its presence conflicts with the user's earlier request to remove the History page; see `product-decisions.md`. |
| [`src/owner-feedback.js`](../apps/web/src/owner-feedback.js) | Normalizes sanitized owner-operation/feedback states for display. |

### Settings, profile and owner screens

| File | Responsibility |
| --- | --- |
| [`src/Profile.jsx`](../apps/web/src/Profile.jsx) | Lazy-loaded profile page container. |
| [`src/ProfileForm.jsx`](../apps/web/src/ProfileForm.jsx) | Editable learning profile/preferences form and validation UI. |
| [`src/profile-model.js`](../apps/web/src/profile-model.js) | Normalizes profile values and user-facing profile labels/defaults. |
| [`src/Workflows.jsx`](../apps/web/src/Workflows.jsx) | Settings and account workflow page, including import, recording, backup/privacy and diagnostic tools. |
| [`src/workflow-model.js`](../apps/web/src/workflow-model.js) | Pure helpers for presenting/reconciling setup, import, backup and account workflow states. |
| [`src/OwnerDashboard.jsx`](../apps/web/src/OwnerDashboard.jsx) | Owner-only operational dashboard UI; it is not the learner dashboard. |
| [`src/owner.css`](../apps/web/src/owner.css) | Owner dashboard layout and table styling. |
| [`src/backup-file-reader.js`](../apps/web/src/backup-file-reader.js) | Reads and validates selected backup files within client limits before restore. |

### Shared UI primitives

| File | Responsibility |
| --- | --- |
| [`src/components/ui/Button/Button.jsx`](../apps/web/src/components/ui/Button/Button.jsx) | Shared button/link primitive and variants. |
| [`src/components/ui/Button/Button.css`](../apps/web/src/components/ui/Button/Button.css) | Button visual variants and interaction states. |
| [`src/components/ui/Button/index.js`](../apps/web/src/components/ui/Button/index.js) | Button barrel export. |
| [`src/components/ui/Form/Input.jsx`](../apps/web/src/components/ui/Form/Input.jsx) | Accessible labeled input primitive using React `forwardRef`. |
| [`src/components/ui/Form/Select.jsx`](../apps/web/src/components/ui/Form/Select.jsx) | Accessible labeled select primitive using React `forwardRef`. |
| [`src/components/ui/Form/Form.css`](../apps/web/src/components/ui/Form/Form.css) | Shared input/select/form-field styles. |
| [`src/components/ui/Form/index.js`](../apps/web/src/components/ui/Form/index.js) | Form primitive barrel exports. |
| [`src/components/ui/DataDisplay/Badge.jsx`](../apps/web/src/components/ui/DataDisplay/Badge.jsx) | Base status/focus badge and profile-aware focus label. |
| [`src/components/ui/DataDisplay/Badge.css`](../apps/web/src/components/ui/DataDisplay/Badge.css) | Badge color, size and focus emphasis variants. |
| [`src/components/ui/DataDisplay/index.js`](../apps/web/src/components/ui/DataDisplay/index.js) | Data-display primitive barrel exports. |
| [`src/components/ui/Layout/Card.jsx`](../apps/web/src/components/ui/Layout/Card.jsx) | Semantic surface/container primitive; use only where a contained surface serves hierarchy. |
| [`src/components/ui/Layout/Card.css`](../apps/web/src/components/ui/Layout/Card.css) | Surface/container styles. |
| [`src/components/ui/Layout/index.js`](../apps/web/src/components/ui/Layout/index.js) | Layout primitive barrel export. |

## Chrome extension — `apps/extension`

| File | Responsibility |
| --- | --- |
| [`manifest.json`](../apps/extension/manifest.json) | MV3 entry points, LeetCode/local site matches, storage permission and icons. Hosted packaging replaces local Recall permission with the exact hosted origin. |
| [`package.json`](../apps/extension/package.json) | Private extension workspace metadata. |
| [`popup.html`](../apps/extension/popup.html) | Toolbar popup shell. |
| [`popup.css`](../apps/extension/popup.css) | Toolbar popup styles. |
| [`setup.html`](../apps/extension/setup.html) | Extension account/setup/settings page shell. |
| [`setup.css`](../apps/extension/setup.css) | Setup/account page styles. |
| [`account.css`](../apps/extension/account.css) | Extension account panel styles. |
| [`icons/recall-16.png`](../apps/extension/icons/recall-16.png) | 16 px toolbar/menu icon. |
| [`icons/recall-32.png`](../apps/extension/icons/recall-32.png) | 32 px extension icon. |
| [`icons/recall-48.png`](../apps/extension/icons/recall-48.png) | 48 px extension management icon. |
| [`icons/recall-128.png`](../apps/extension/icons/recall-128.png) | 128 px extension listing icon. |
| [`src/service-worker.js`](../apps/extension/src/service-worker.js) | MV3 background entry point; routes messages, initializes account/import/capture services and handles durable extension state. |
| [`src/content.js`](../apps/extension/src/content.js) | LeetCode page observer/entry point connecting accepted-state changes to capture UI and import adapters. |
| [`src/adapters/leetcode.js`](../apps/extension/src/adapters/leetcode.js) | Reads current LeetCode problem page details and available tags. |
| [`src/adapters/leetcode-import.js`](../apps/extension/src/adapters/leetcode-import.js) | Queries/parses the signed-in account's accepted-problem/recent-submission data and validates responses. |
| [`src/capture.js`](../apps/extension/src/capture.js) | Renders the compact accepted-practice panel, required assistance/topic choices, searchable Other selection, frozen save and recovery controls. |
| [`src/account-client.js`](../apps/extension/src/account-client.js) | Extension-side JSON client for Recall account, connection and private API requests. |
| [`src/account-page.js`](../apps/extension/src/account-page.js) | Entry point/lifecycle for the extension's settings/account document. |
| [`src/account-ui.js`](../apps/extension/src/account-ui.js) | Builds account/connection/import status and recovery controls in the extension page. |
| [`src/account-worker.js`](../apps/extension/src/account-worker.js) | Background account state, token verification/refresh, workspace isolation and import coordination. |
| [`src/connection-flow.js`](../apps/extension/src/connection-flow.js) | Connection state machine shared by site/extension; routes local legacy versus hosted website-login connection. |
| [`src/leetcode-connection.js`](../apps/extension/src/leetcode-connection.js) | Verifies which LeetCode username is active and prevents accidental account mixing. |
| [`src/runtime-config.js`](../apps/extension/src/runtime-config.js) | Local Recall origin defaults. Hosted copy is generated/replaced during ZIP packaging; edit the package script for that transformation. |
| [`src/website-bridge.js`](../apps/extension/src/website-bridge.js) | Isolated-world content script relaying same-origin website messages to the extension worker with sender and payload checks. |
| [`src/practice-notifications.js`](../apps/extension/src/practice-notifications.js) | Notifies an open Recall website after a confirmed practice write so its cached dashboard can refresh. |
| [`src/import-controller.js`](../apps/extension/src/import-controller.js) | Import orchestration: read provider data, checkpoint batches, pause/resume, retry, and report status. |
| [`src/import-request.js`](../apps/extension/src/import-request.js) | Sends a bounded/idempotent import batch to the Recall API and validates the response. |
| [`src/import-session.js`](../apps/extension/src/import-session.js) | Persists run identity, frozen input, checkpoint and recovery state across popup/tab/worker restarts. |
| [`src/import-view.js`](../apps/extension/src/import-view.js) | Renders import progress, failure, retry, pause/resume and completion UI. |
| [`src/setup.js`](../apps/extension/src/setup.js) | Setup page orchestration and message listeners. |
| [`src/setup-recordings.js`](../apps/extension/src/setup-recordings.js) | Lists saved/pending recordings and provides edit, retry, restore or resolve controls. |
| [`src/theme.js`](../apps/extension/src/theme.js) | Applies Recall theme styles/tokens inside the LeetCode page. |
| [`src/theme-page.js`](../apps/extension/src/theme-page.js) | Applies theme behavior to extension-owned pages. |
| [`src/legacy-runner.js`](../apps/extension/src/legacy-runner.js) | Compatibility runner for older/import-era request formats and recovery. Preserve while old drafts need to remain usable. |
| [`src/legacy-setup.js`](../apps/extension/src/legacy-setup.js) | Compatibility setup entry/state for legacy imports. Check live references before removing. |
| [`src/popup.js`](../apps/extension/src/popup.js) | Current popup entry point; exposes compact account/connection/settings actions. |
| [`src/popup-legacy.js`](../apps/extension/src/popup-legacy.js) | Older popup flow kept for compatibility/tests; verify manifest/runtime references before deleting. |

## Build and developer scripts — `scripts`

| File | Responsibility |
| --- | --- |
| [`dev.js`](../scripts/dev.js) | Starts API and Vite directly from Node for cross-platform `npm run dev`; stops both together. |
| [`package-extension.js`](../scripts/package-extension.js) | Builds a deterministic ZIP containing only allowlisted extension files, replacing local URLs with hosted URLs when configured. |
| [`generate-extension-icons.js`](../scripts/generate-extension-icons.js) | Regenerates extension icon assets from the source design. |
| [`owner.js`](../scripts/owner.js) | Local CLI to grant/list owner dashboard access; owner roles are not granted through HTTP. |
| [`test-owner.js`](../scripts/test-owner.js) | Starts owner route fixture and health/permission smoke workflow. |
| [`test-capture.js`](../scripts/test-capture.js) | Serves the mock LeetCode capture browser fixture for manual/automated extension UI review. |
| [`test-extension-ui.js`](../scripts/test-extension-ui.js) | Serves extension UI fixtures with simulated Chrome messages and account/import state. |
| [`test-website-import.js`](../scripts/test-website-import.js) | Runs website-to-extension connection/import browser fixture. |
| [`test-accounts.js`](../scripts/test-accounts.js) | Starts the simulated auth/accounts server and fixture routes; does not contact real Supabase. |

## Test suite — `tests`

The filename is the test area; the code assertions are the detailed contract.
`*.integration.js` files with database dependencies are run by
`npm run test:db`, which needs a disposable PostgreSQL test database. The normal
`npm run test` suite uses local fakes/fixtures and does not need Supabase.

| File(s) | Coverage |
| --- | --- |
| [`api.test.js`](../tests/api.test.js), [`data-routes.test.js`](../tests/data-routes.test.js), [`web-api.test.js`](../tests/web-api.test.js) | API response shape, route validation, status/error and frontend client behavior. |
| [`domain.test.js`](../tests/domain.test.js), [`problem-scope.test.js`](../tests/problem-scope.test.js), [`pattern-catalog.test.js`](../tests/pattern-catalog.test.js), [`classification-examples.test.js`](../tests/classification-examples.test.js) | Input boundary, DSA scope, pattern/unit catalog, tag precedence and reviewed classification examples. |
| [`goal-policy.test.js`](../tests/goal-policy.test.js), [`dashboard-model.test.js`](../tests/dashboard-model.test.js), [`retention.test.js`](../tests/retention.test.js), [`threshold.test.js`](../tests/threshold.test.js) | Quota allocation, pattern order/presentation, strength equations and queue threshold behavior. |
| [`capture.test.js`](../tests/capture.test.js), [`capture-panel.test.js`](../tests/capture-panel.test.js), [`accepted-trigger.test.js`](../tests/accepted-trigger.test.js), [`import-content.test.js`](../tests/import-content.test.js) | Accepted transition detection, capture payload UI and LeetCode DOM/provider adapters. |
| [`connection-flow.test.js`](../tests/connection-flow.test.js), [`website-connection.test.js`](../tests/website-connection.test.js), [`extension-auth.test.js`](../tests/extension-auth.test.js), [`leetcode-connection.test.js`](../tests/leetcode-connection.test.js), [`extension.test.js`](../tests/extension.test.js), [`runtime.test.js`](../tests/runtime.test.js) | Website handshake, account identity, extension auth and runtime configuration. |
| [`import-controller.test.js`](../tests/import-controller.test.js), [`import-session.test.js`](../tests/import-session.test.js), [`import-ui.test.js`](../tests/import-ui.test.js), [`legacy.test.js`](../tests/legacy.test.js), [`import-content.test.js`](../tests/import-content.test.js) | Resume/retry/checkpoint state, import progress UI, provider reads and compatibility. |
| [`practice-cache.test.js`](../tests/practice-cache.test.js), [`practice-notifications.test.js`](../tests/practice-notifications.test.js), [`date-format.test.js`](../tests/date-format.test.js) | Refresh after save, notification identity and practice date display/timezone behavior. |
| [`auth-confirmation.test.js`](../tests/auth-confirmation.test.js), [`auth-cooldowns.test.js`](../tests/auth-cooldowns.test.js), [`auth-feedback.test.js`](../tests/auth-feedback.test.js), [`navigation.test.js`](../tests/navigation.test.js), [`session-loader.test.js`](../tests/session-loader.test.js) | Confirmation/reset navigation, user feedback, retry cooldowns, hash routes and session loading. |
| [`profile.test.js`](../tests/profile.test.js), [`workflow-model.test.js`](../tests/workflow-model.test.js), [`owner-feedback.test.js`](../tests/owner-feedback.test.js), [`popup.test.js`](../tests/popup.test.js), [`extension-theme.test.js`](../tests/extension-theme.test.js) | Profile/settings state, owner feedback, popup behavior and theme application. |
| [`backup-limits.test.js`](../tests/backup-limits.test.js), [`backup-file-reader.test.js`](../tests/backup-file-reader.test.js), [`accounts.test.js`](../tests/accounts.test.js), [`auth-feedback.test.js`](../tests/auth-feedback.test.js) | Backup limits/file validation and hosted account UI/state fixture behavior. |
| [`transaction.test.js`](../tests/transaction.test.js), [`database-diagnostics.test.js`](../tests/database-diagnostics.test.js), [`owner.test.js`](../tests/owner.test.js), [`owner-feedback.test.js`](../tests/owner-feedback.test.js) | Transaction cleanup, safe database diagnostics and owner policy/store behavior. |
| [`accounts.integration.js`](../tests/accounts.integration.js), [`database.integration.js`](../tests/database.integration.js), [`deletion.integration.js`](../tests/deletion.integration.js), [`history.integration.js`](../tests/history.integration.js), [`import-bulk.integration.js`](../tests/import-bulk.integration.js), [`journal.integration.js`](../tests/journal.integration.js), [`legacy.integration.js`](../tests/legacy.integration.js), [`owner.integration.js`](../tests/owner.integration.js), [`retention.integration.js`](../tests/retention.integration.js), [`robustness.integration.js`](../tests/robustness.integration.js), [`strength.integration.js`](../tests/strength.integration.js) | PostgreSQL behavior, tenancy, import/capture, history, deletion, backups, robustness, ranking and transactional rollback. |
| [`accounts.test.js`](../tests/accounts.test.js), [`accounts.integration.js`](../tests/accounts.integration.js), [`capability.test.js`](../tests/capability.test.js), [`journal.test.js`](../tests/journal.test.js), [`retention-setup.test.js`](../tests/retention-setup.test.js) | Account/capability and recording journal/retention setup behavior. |
| [`launch.test.js`](../tests/launch.test.js), [`react-imports.test.js`](../tests/react-imports.test.js) | Launch/runtime configuration requirements and regression check for importing only real React exports. |
| [`fixtures/capture-browser.js`](../tests/fixtures/capture-browser.js), [`fixtures/capture.html`](../tests/fixtures/capture.html) | Browser-like LeetCode capture harness. |
| [`fixtures/extension-ui.js`](../tests/fixtures/extension-ui.js) | Chrome runtime/storage/message simulator for the extension account/setup UI. |
| [`fixtures/website-import.js`](../tests/fixtures/website-import.js) | Website/extension import bridge fixture used by the integration script. |

## Documentation — `docs`

| File | Responsibility |
| --- | --- |
| [`index.md`](index.md) | Navigation to current contracts, intent, research, historical records and documentation rules. |
| [`product-brief.md`](product-brief.md) | Product thesis, ideal user loop, dashboard/pattern UX, trust promise and visual/non-goals. |
| [`product-decisions.md`](product-decisions.md) | Chosen/rejected directions, why they changed, collaboration preferences and source mismatches. |
| [`data-model.md`](data-model.md) | Domain entities and count/coverage/practice semantics. |
| [`architecture.md`](architecture.md) | Current system boundary and main web/API/extension flows. |
| [`api.md`](api.md) | HTTP route reference and request/retry/security expectations. |
| [`codebase-map.md`](codebase-map.md) | This source/test/migration/document inventory. |
| [`retention.md`](retention.md), [`retention-research.md`](retention-research.md), [`threshold-audit.md`](threshold-audit.md) | Adopted practice/queue policy, research context, and an older threshold audit. |
| [`pattern-catalog.md`](pattern-catalog.md), [`import-classification.md`](import-classification.md), [`pattern-classification-evidence.md`](pattern-classification-evidence.md), [`classification-audit.md`](classification-audit.md) | Current catalog and classifier, mapping evidence, and a dated workspace audit. |
| [`goal-policy-evidence.md`](goal-policy-evidence.md) | Evidence boundaries for interview/deep goal weights and quota choices. |
| [`account-setup.md`](account-setup.md), [`website-extension-login.md`](website-extension-login.md), [`owner-dashboard.md`](owner-dashboard.md), [`deploy-render.md`](deploy-render.md) | Auth, website-extension bridge, owner access, and hosting. |
| [`legacy-import.md`](legacy-import.md), [`extension-recording.md`](extension-recording.md), [`extension-import-reliability.md`](extension-import-reliability.md), [`import-performance.md`](import-performance.md) | Capture/import behavior, recovery and performance implementation notes. |
| [`public-site.md`](public-site.md), [`ux-onboarding-audit-2026-10-08.md`](ux-onboarding-audit-2026-10-08.md), [`ux-onboarding-implementation.md`](ux-onboarding-implementation.md) | Public launch path; onboarding audit and its later implementation note. |
| [`testing.md`](testing.md), [`app-review.md`](app-review.md), [`component-inventory.md`](component-inventory.md), [`frontend-rebuild.md`](frontend-rebuild.md) | Test scopes and older product/design/UI review artifacts. |
| [`phase-2.md`](phase-2.md), [`phase-3.md`](phase-3.md), [`phase-4.md`](phase-4.md), [`phase-5.md`](phase-5.md), [`phase-6.md`](phase-6.md) | Historical staged walkthroughs; verify current source before following literal instructions. |
| [`audit-2026-09-30.md`](audit-2026-09-30.md), [`dashboard-audit-2026-10-02.md`](dashboard-audit-2026-10-02.md), [`comprehensive-audit-2026-10-03.md`](comprehensive-audit-2026-10-03.md) | Dated audit results and development history. |

## Generated and local files

- `node_modules/`, Vite `dist/` directories, and temporary `.tmp-*`/`.log`
  files are local/generated artifacts, not application source.
- `apps/web/public/downloads/recall-extension.zip` is produced by
  `npm run package:extension`. Rebuild it from `apps/extension` and deployment
  configuration rather than hand-editing the archive. The packaged hosted ZIP
  may differ from the local source manifest/runtime URLs by design.
- `.env` files are local secret-bearing configuration. Only `.env.example`
  files belong in Git.
- `apps/extension/icons/*.png` are checked-in binary assets generated/updated
  by the icon script; the manifest maps each size.

