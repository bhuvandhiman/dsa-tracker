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

## Phase 2 — implemented; real project configuration pending

Split signup/login screens use email/password through Supabase Auth. Google
sign-in is deferred at the user's request.
Confirmation/resend and password recovery are implemented. The API verifies
sessions and isolates all data resources in per-user workspaces. Existing local
data remains in local mode; an explicit backup/restore can transfer it.

Short setup now saves preparation mode and coverage goal, guides extension
installation and opens the private dashboard. The dedicated installation page
provides a ZIP, Load unpacked steps, a video placeholder and a configurable future
store link. See [account setup](account-setup.md) for Supabase configuration,
validation and the existing-data boundary. Real sign-in/email delivery requires
your project URL, public key and provider settings.

## Phase 3 — local extension connection implemented

Sign into the extension with the same confirmed email/password as the website.
Authenticated imports and saves reach the verified owner's private workspace.
Local drafts, queues, import checkpoints and retries are isolated per account;
historical solves remain separate from dated practice. Credentials use session
storage, so Chrome restarts and extension reloads require sign-in again. The
installation acknowledgement remains manual. Real user flows and hosted imports
still need verification/deployment; fixture tests do not claim those are complete.

## Phase 4 — launch

Configure hosting, domain, HTTPS, backups, monitoring and recovery. Add privacy
information and account export/deletion controls. Replace hash-based public
routes with server-supported URLs for discoverability when deploying the
public site. Validate complete signup-to-practice flows before public release.
