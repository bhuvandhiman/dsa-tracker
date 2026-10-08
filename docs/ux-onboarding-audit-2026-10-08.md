# Recall user journey audit — 8 October 2026

## Conclusion

The hardest part of onboarding is getting from a verified Recall account to a connected extension and an imported, personal pattern queue. The user must coordinate several tabs and two applications before experiencing Recall's main benefit. Setup completion currently records an acknowledgement, not proof that this connection or import worked.

The next redesign should make the website the home for this journey: show actual connection states, guide the remaining action, report import progress, and finish with an actionable pattern recommendation. Keep the established visual design, classification rules, and scoring intact while fixing the journey.

## Scope and confidence

- Source reviewed at commit `5e86f32` across public pages, authentication, setup, dashboard, patterns, settings, extension installation, account connection, import, and practice capture. Relevant API, repository, and packaging behavior was also inspected.
- Findings marked **confirmed** follow directly from source. Friction priorities and proposed designs are expert judgments, not measured conversion or abandonment data.
- Live browser inspection was blocked by the tool's Windows sandbox failure. Public HTTP checks were inconclusive; they do not establish an outage. The 21st review CLI was unavailable.
- Mobile layout, real email delivery, cross-browser behavior, production connection timing, and a complete real-account import remain runtime verification tasks.
- This audit changes documentation only. It does not change product behavior or install analytics.

## Current journey

Landing page → create account → verify email when required → choose focus and coverage target → download ZIP → extract it → open Chrome Extensions → enable Developer mode → load the correct folder → sign into LeetCode in the same profile → refresh Recall to connect → acknowledge installation → open extension Settings → import previous solves → collect available recent practice dates → return to dashboard → open a pattern → expand a subpattern → choose a saved problem.

Some steps are conditional, and returning users can skip completed steps. This is a sequence of responsibilities, not a measured click count. The problem is the lack of one place that explains which responsibility is complete and what remains.

## Prioritized findings

### 1. Setup completion does not mean the integration works — confirmed, highest priority

**Evidence:** `apps/web/src/Onboarding.jsx:16,23,26`; `apps/web/src/App.jsx:48-53`; `apps/api/src/app.js:71`.

“I've loaded Recall” stores `extensionAcknowledged`. The final screen says the workspace is ready before verifying extension connection or import. Private workspace access depends on completed setup, so installation is a gate even for someone who only wants to explore or return on mobile.

**Change:** Separate account setup from integration status. Offer an honest “Set up later” path. Track extension detected, Recall connected, LeetCode signed in, import running, usable partial results, and import complete independently. Do not label an acknowledgement as a verified connection.

### 2. Connection is invisible from the website — confirmed, highest priority

**Evidence:** `apps/web/src/extension-bridge.js`; `apps/extension/src/website-bridge.js`; `apps/extension/src/account-ui.js`; `apps/extension/src/account-worker.js`.

The website sends short-lived credentials to the extension but does not receive a user-visible success/failure state. The extension bridge ignores the returned response. Connecting from the extension opens another website login tab and tells the user to return afterward. This makes a successful automatic login feel uncertain and failures difficult to recover from.

**Change:** Add a restricted acknowledgement/status channel and show connection state in the website. Reuse an existing suitable Recall tab where possible. Preserve the pending action across reconnects. Continue transferring only short-lived access credentials; improving this flow does not require sharing refresh credentials.

### 3. Manual installation has too many disconnected instructions — confirmed flow, high friction

**Evidence:** `apps/web/src/Onboarding.jsx:9-16`; `apps/extension/src/legacy-setup.js:13-15`.

Users must navigate the filesystem, Chrome settings, LeetCode, the website, and extension Settings. A new installation also opens the extension's own setup page, creating competing onboarding surfaces. Without a configured video, a large “coming soon” block occupies the installation page.

**Change:** Keep unpacked installation for now. Use one guided connection page with the current action prominent, practical screenshots or the future video, and detected completion where possible. Explain desktop Chrome and the same-profile requirement early. Hide the video placeholder until a video exists. Make the extension's first-run page lead into the same journey.

### 4. A recommended pattern can end in an empty list — confirmed, high priority for the USP

**Evidence:** `apps/web/src/PatternOverview.jsx:34`; `apps/web/src/LiveDashboard.jsx:39-55`; `apps/web/src/SubpatternProblems.jsx:21,41,47-49`; `apps/api/src/repository.js:254-287`.

The recommendation opens a category, then the user expands a subpattern. Its problem list comes from stored problems. A weak or untouched area can therefore contain no problems, leaving the user with instructions to import or record practice rather than a way to start. The prominent play icon expands a list; it does not itself start practice.

**Change:** Give the recommendation a concrete next action. Where saved problems exist, offer a suitable review problem. Otherwise offer an explicit way to find matching problems on LeetCode, using verified topic links where supported. Open the recommended subpattern directly or pre-expand it. Do not invent an unbuilt recommendation catalog or misrepresent an empty library as a system failure.

### 5. The first dashboard does not reflect onboarding state — confirmed, high priority

**Evidence:** `apps/web/src/PatternOverview.jsx:24-35`; `apps/web/src/LiveDashboard.jsx:92-98`.

The main dashboard appears before users have useful personal data. The retention area can show a dash and “Waiting for dated practice,” with explanatory text but no direct activation action. Imported undated solves correctly improve coverage without establishing retention, but the first experience does not make that distinction rewarding or actionable.

**Change:** Use lifecycle states inside the existing layout: connect/import when empty; real progress while importing; a concise summary of organized solves afterward; then one next practice action. Keep unknown retention honestly unknown. A clearly labeled example preview can help users explore before connecting.

### 6. Import completion is split across panels — confirmed

**Evidence:** `apps/extension/src/setup.js:15,32,35`; `apps/extension/src/setup-retention.js:43,45`; `apps/extension/src/setup.html`.

Recent practice dates already load automatically after the main import; a second manual import is not required. However, “Import complete” can appear while the date stage is still running, and each stage has separate feedback. The website does not own or display this combined progress.

**Change:** Present one journey: finding solves → organizing patterns → checking available practice dates → ready. Distinguish usable partial results from a fully finished sync. Keep existing checkpoints, retries, deduplication, and honest date limitations. Use real counts, not invented progress percentages or estimates.

### 7. Copy contradicts the new single-login flow — confirmed defect

**Evidence:** `apps/web/src/PublicPages.jsx:17,63,77`; `apps/web/src/Privacy.jsx:5`; `apps/extension/src/capture.js:23`.

Public copy still tells users to sign into the extension with the same email and password, although website login now connects it automatically. Privacy copy also describes deployment as planned. Some extension source text is intentionally rewritten during hosted packaging; those rewritten strings should not be treated as proven production defects.

**Change:** Use consistent language for three distinct states: signed into Recall, extension connected, and signed into LeetCode. Update hosted product descriptions to match the shipped flow. Keep deployment and local development instructions out of the normal onboarding journey.

### 8. Authentication failures and return navigation need clearer recovery — confirmed

**Evidence:** `apps/web/src/AuthPages.jsx:16-28`; `apps/web/src/use-auth.js`; `apps/web/src/auth-client.js:23-24`; `apps/web/src/App.jsx:51-53,107`.

A failed configuration request can fall into copy about online sign-in still being connected and opening a local workspace. That is misleading on a hosted site. Login also routes to dashboard/setup rather than retaining the intended destination. The unauthenticated setup fallback emphasizes account creation even when the visitor may already have an account.

**Change:** Distinguish loading, intentionally local mode, and hosted service failure. Give each a relevant retry action. Preserve an allowlisted internal return destination. Offer login and signup appropriately. Email verification already has resend and change-email actions; preserve them rather than rebuilding that part unnecessarily.

### 9. The product asks users to learn too much terminology early — design recommendation

**Evidence:** `apps/web/src/Onboarding.jsx:26`; `apps/web/src/PatternMetrics.jsx:21-24`; `apps/web/src/LiveDashboard.jsx:28,53-54`; `apps/web/src/PatternOverview.jsx`.

The early journey introduces target sizes, coverage, credits, practice strength, experience, retention, practice blocks, prior solves, approaches, and subpatterns. These distinctions may be legitimate internally, but they compete with the simple question: what should I practice next?

**Change:** Lead with the next action and visible progress. Keep focus selection, use a sensible editable goal default, and move detailed explanations into existing disclosure areas. Preserve actual weighted values and metric semantics. Do not rename different measures as if they were interchangeable.

### 10. Saving practice has effort but little visible payoff — confirmed behavior, design recommendation

**Evidence:** `apps/extension/src/capture.js:62-96,122-134`.

Assistance and topics require explicit input. This supports honest retention and classification and matches the product requirements. But the form can become lengthy, while success is only a short “practice saved” toast. Users do not immediately see which pattern received the practice.

**Change:** Keep topic confirmation required. Prioritize suggested topics, keep Other/search available, and do not automatically confirm inferred topics. Make the save action easy to reach. After a successful response, show the confirmed assigned pattern and a link to view it; only display score changes if they are actually returned or verified.

### 11. Settings do not provide a central connection hub — confirmed structure

**Evidence:** `apps/web/src/Workflows.jsx:79`; `apps/extension/src/account-ui.js`; `apps/extension/src/setup.html`.

Website settings emphasize workspace data, backups, and account controls, while importing and connection recovery live in extension settings. The user has to remember which settings belong to which app.

**Change:** Make connection/import status and recovery discoverable from website Settings and the empty dashboard. Keep backup, restore, and deletion available but secondary. The extension can continue doing browser-only work behind this website-owned flow.

### 12. Mobile onboarding needs a separate recovery path — source-derived risk; runtime check required

**Evidence:** `apps/web/src/accounts.css`; `apps/web/src/Onboarding.jsx`.

The split authentication page stacks its story before the form on smaller screens. Installation has no explicit mobile deferral path, although unpacked desktop installation cannot be completed there in the intended way.

**Change:** Prioritize the form on mobile. Let users explore their account and resume extension setup later on desktop. Validate actual viewport layouts, keyboard behavior, and touch targets before declaring this resolved.

## Recommended target journey

1. Understand the benefit through the existing clearly labeled example and one primary signup action.
2. Create/verify the Recall account, preserving the intended destination.
3. Choose a focus; leave advanced goal tuning for later.
4. Enter the workspace with a clear “Connect LeetCode” action and a genuine option to continue later.
5. Use one connection screen to guide installation and display actual extension, account, and LeetCode status.
6. Start import and see real progress in the same journey, with recoverable partial results.
7. See what was organized and one actionable pattern to practice.
8. Save practice through the extension, confirm its destination, and return to visible progress.

For returning users, start at their dashboard or intended pattern. Only interrupt with the specific recovery needed; do not repeat the entire setup wizard.

## Phased implementation

### Phase A — make connection and onboarding trustworthy

- Correct contradictory copy and configuration-error states.
- Decouple workspace access from installation acknowledgement.
- Add verified bridge status and one website connection surface.
- Unify installation entry points and preserve the pending destination/action.
- Keep manual ZIP installation; remove the empty video placeholder.

**Acceptance:** A user can tell whether Recall is connected without opening two settings pages. Loading/reloading the extension can recover through one clear action. An unavailable API produces an accurate retry state. A desktop setup can be deferred without pretending it succeeded.

### Phase B — deliver the first useful recommendation

- Surface combined import progress and partial completion in the connection journey.
- Add an honest empty/imported/dashboard state and organized-solves summary.
- Give recommended patterns an actionable destination, including empty-library cases.

**Acceptance:** After import the user can identify the next practice action without interpreting setup instructions. A category with no saved problems has a useful route forward. Undated history never appears as measured retention.

### Phase C — smooth the repeat practice loop

- Simplify visible terminology without changing calculations.
- Improve required topic confirmation and save feedback.
- Centralize connection recovery and verify mobile/authentication layouts.

**Acceptance:** Saving practice makes its assigned pattern clear. Reconnection preserves drafts and account boundaries. Existing returning-user flows remain fast.

## Keep these existing strengths

- Approved palette, full-width pattern rows, priority ordering, and honest practice/retention semantics.
- Clearly labeled public example data.
- Website-based extension login without another password form.
- Required topic confirmation and searchable manual classification.
- Per-account draft isolation, resumable import, deduplication, and automatic recent-date lookup.
- Existing accessible form labels, focus styles, modal behavior, and reduced-motion support.

## Runtime validation and measurement before calling the redesign complete

Test fresh signup, email verification in the same and different browser profiles, returning login to a deep link, already-installed extension, new installation, extension reload, browser restart, expired session, sign-out/account switch, LeetCode signed out, API unavailability, interrupted import/resume, partial date lookup, empty pattern library, first saved practice, and desktop/mobile keyboard and touch flows.

If measurement is added later, use a small explicit activation funnel: account verified → extension connected → import usable → first recommendation opened → first practice saved. Compare time to first useful recommendation, recoverable failure counts, and completion rates before/after. No baseline is currently established; do not claim conversion improvements until measured. Avoid collecting passwords, tokens, or unnecessary problem content as analytics.
