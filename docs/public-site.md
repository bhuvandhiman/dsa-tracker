# Public website phases

## Phase 1 — complete

Home (`/` or `#/home`) introduces the pattern queue, coverage, practice strength,
extension workflow and goal modes. About (`#/about`) explains the product's
purpose, evidence limits and independent relationship with LeetCode.

`#/home?section=how-it-works` and `#/home?section=questions` support direct
section links, reload and keyboard focus. The public shell shares the existing
theme and links to the working `#/dashboard` workspace. Explicit Patterns and
Workspace links retain their behavior, including old links that fall back to
Dashboard.

Illustrative examples reuse the product's metric components and never load or
write personal practice data. Public copy reflects the current local product.
There are no pretend account forms or hosted-sync claims.

Validation: lint, 199 unit tests and production build pass. Browser checks cover
Home/About in light and dark mode, 390px/320px layouts without horizontal
overflow, keyboard FAQ disclosure, section focus and workspace/pattern entry.

## Phase 2 — accounts and private workspaces

Choose the authentication service and sign-in method before adding working
signup/login/recovery forms. Add authenticated API access and user ownership to
practice, goals, placements, imports and backups together. Test cross-user
isolation. Keep existing local data recoverable with an explicit migration path.

## Phase 3 — extension connection and onboarding

Connect the extension to the authenticated hosted workspace. Isolate local
drafts, queues and retries per account. Guide new users through goal selection,
extension connection and optional import; preserve the distinction between
historical solves and dated practice.

## Phase 4 — launch

Configure hosting, domain, HTTPS, backups, monitoring and recovery. Add privacy
information and account export/deletion controls. Replace hash-based public
routes with server-supported URLs for discoverability when deploying the
public site. Validate complete signup-to-practice flows before public release.
