# Recall visual foundation

The user selected the second reference image's warm palette and typography,
with playful rounded cards and details inspired by both supplied images.
The layout must be original and tailored to DSA rather than copied from either image.
The website fills the viewport with the ivory canvas. Do not wrap the page in a
centered card, outer border, rounded frame, shadow, or contrasting background gutter.
Rounded cards remain appropriate within the page.
The top-bar moon switches to dark mode; the sun switches back to light mode.
Dark mode uses warm charcoal surfaces with cream text, keeping the colorful inner
cards. Light mode is the default; the explicit choice is saved in local storage.

Tokens live in apps/web/src/styles.css: ivory #fafbe9, coral #e96586,
mustard #f2b632, teal #2c8075, and ink #202720. Typography uses the locally
available Trebuchet MS / Segoe UI stack. No external font service is required.

Phase 2 connects live practice and goal data in one combined view, without a
Coverage/Retention switch. Patterns and subpatterns use consistent catalog order,
with Other last. Search includes subpattern names; matching categories open into a separate detail screen.
Coverage rings and strength bars remain separately labelled, without mastery claims
or invented scores. Goal controls change only the existing goal. Problems expand within each subpattern; their notebooks stay inline. History and Workspace retain dedicated pages.

21st catalog search found Card Tabs, Tabs with Icons, and Card primitives.
The references informed component discovery; no catalog source code was retrieved
or installed. Existing React/Vite supports this small CSS-based foundation without
adding a parallel shadcn dependency stack.

Preserve the API, database, scoring and coverage policies, and Chrome extension.
The old frontend remains recoverable through Git history.

Phase 2 catalog search found Progress primitives. Native progress elements and CSS coverage rings fit the established JavaScript/CSS foundation; no catalog code was installed.

User layout revision: Dashboard shows overview and goals. Patterns is a separate route with long, full-width neutral rows and coral/teal/mustard accents. Each row opens a separate routed subpattern detail panel. Avoid tiled pattern cards and inline subpattern expansion.

Phase 3 reuses neutral full-width rows, native labelled filters, and explicit inline correction forms. Problem lists preserve scope and filters in detail/return URLs. Imported submissions are read-only; undated solves remain separate. Workspace restore previews the selected backup before an explicit action. 21st search found filter-table and combobox references; existing native controls fit the current React/CSS foundation without installing another component stack.

Phase 4 carries the same palette and typography into extension pages and the shadow-root recorder. `apps/extension/src/theme.js` shares extension tokens and moon/sun controls. The extension persists its own preference in Chrome local storage and synchronizes its surfaces; the website's preference remains independent. Panel storage listeners are removed on close. 21st Theme Toggle references informed discovery; native buttons and existing forms were reused.

Final user revision: each subpattern expands an inline problem list. Use only Difficulty and Last practiced buttons for ascending/descending sorting, before pagination. Missing values appear last. Problem notebooks and corrections stay inline; remove the separate Problems route and navigation. Category detail routes remain. Native disclosure buttons reuse the existing rows and design tokens. The four planned development phases end here.

Inline browsing catalog lookup found Accordion Multiple and Expand All Accordion references. Existing native buttons provide independent accessible disclosure without adding a dependency. Review found informational palette literals only.

Current compact browsing revision: the complete subpattern summary toggles its list. Problem rows contain only name, difficulty, LeetCode icon link, last practiced date, and trailing ellipsis. Column headers cycle ascending, descending, normal. The ellipsis opens only Edit pattern, using existing provider-topic and curated candidates, plus a final explicit manual catalog choice. No problem notebook expands from these rows. History remains available on the History page. 21st Table Row Actions references informed discovery; native details, table, buttons, and selects reuse this project’s framework.

History removal: only Dashboard, Patterns, and Workspace remain in navigation. Remove the History route, notebook and recording-edit frontend, and their unused helpers/styles. Old History URLs fall back to Dashboard. Keep stored practice, retention calculations, API endpoints, extension capture, backup/restore, and removed-record recovery intact.

Coverage priority restored: Patterns and subpatterns preserve API goal-attention order instead of re-sorting by catalog index. Goal deficits remain the primary signal, with the existing bounded practice-strength modifier. Other remains last. Search preserves relative priority. Catalog order remains appropriate only in manual pattern selectors. Without a configured goal, retain the API’s practice-priority fallback.

Current frontend refinement: maintain ivory/coral/mustard/teal in both themes, use compact hierarchy and visible priority ranks, color the three dashboard evidence tiles, and link directly to the first coverage gap. Use a native modal dialog for Edit pattern with Escape and restored trigger focus. Consolidate shared CSS tokens and rules; avoid unused component stacks and empty pagination. No History or notebooks return.

Pattern-first dashboard: a compact pattern-focused heading replaces the decorative hero. The dominant central retention bar is an equal-weight mean of assessed category strength scores, excluding Other and undated categories; display its assessed-pattern denominator and explain the estimate. Three priority rows link to real patterns in API order. Easy/Medium/Hard use teal/yellow/coral bars segmented by category target; fill is credited/target, with pattern name, counts and percentage on hover, tap or keyboard focus and Escape dismissal. Reuse native controls and the existing scoring API. 21st segmented Progress Bar discovery informed implementation without installing code.

Pattern browsing now reuses shared retention/difficulty metrics and segmented detail coverage. Reserve the mustard outline and play icon for the first API-ranked item, so the next step is visible without instructional copy. Keep later rows neutral. Subpattern actions become chevrons when expanded; complete summaries still toggle inline problems. Accessible names identify the recommended next item without adding visible text. 21st ranked progress discovery was consulted; existing native components were reused.

Priority balance revision: primary ranked-row bars now show the inverse of the API attention score, so the first is least filled and subsequent scored items are progressively fuller. Attention combines 65% remaining difficulty-balanced coverage credits and 35% profile-target-weighted practice weakness, including completed coverage. Normalize against a fixed matrix target at each hierarchy level, not live min/max ranks. Label this Priority balance, keep actual retention and solve counts underneath, and retain true retention in the dashboard/category summary. Other has no scored bar. Profile changes reweight the matrix; solved coverage and practice change attention without rewriting history.

Current strength presentation (2026-10-02): preserve the continuous coral/mustard track, but give it one score. Coral is the existing experience baseline from breadth/repeat work; mustard is only the additional recent-practice contribution. The segments sum to the same assessed strength shown by the dashboard tracker. Unknown dates show coral experience and an unassessed label, without an overall strength percentage. Focus badges and short need/queue-held labels explain recommendation context independently of fill. Primary solves are uncapped assigned-problem counts; practice evidence is partitioned into dated and dates-unknown distinct problems following recorded approaches. Label the difficulty section Goal coverage. Four weighted practice-block dots replace both next-credit counters and the projected dashed coverage marker. Fractional dots support hints/solutions; show completed-block totals after reset. Explanations remain in a shared collapsed disclosure on both list and detail routes. Queue policy v8, goals, classification, history and hold/decay calculations are unchanged.

Audit refinement (2026-10-02): preserve the approved strength and queue design. Include zero-target extras in raw difficulty summary counts; label solved problems without practice dates as Dates unknown. Primary pattern edits refresh parent metrics immediately, preserve recorded approaches, and clamp paginated lists after moves. URL search follows navigation. Remove unused urgency/legacy layout rules. The manual picker uses the authoritative placement catalog without calculating dashboard scores. Balanced fill still uses capped subpattern credits.

Problem-row refinement (2026-10-02): titles link directly to their validated LeetCode URL in a new tab; remove the separate logo column. Difficulty text uses teal for Easy, amber for Medium and coral/red for Hard, with readable light/dark theme tokens. Keep sorting and the trailing edit menu. Mobile rows reserve one action column.

Extension recorder refinement (2026-10-02): remove Practiced approach and Practiced at inputs. Keep assistance choices and optional topic context. Resolve the practice unit automatically with inferred provenance; retain event timestamps internally and exact pending payloads on retry. Background lookup failures fall back to API classification without adding required configuration.

Required classification (2026-10-02): Topics used is now required for new extension recordings and drives primary placement and the recorded practice unit. Other is a mutually exclusive row that reveals an inline search field and full pattern select. All learning patterns are available; the unclassified fallback is not a selectable learning pattern. Save validates a selected topic or manual pattern. Preserve original provider metadata, old practice snapshots and pending-save retries.

Public site phase 1 (2026-10-02): the empty route now opens Home; explicit Dashboard, Patterns and Workspace routes stay available. Home and About use the established full-page canvas, palette, typography, theme control and button styles. Shared StrengthBar, FocusBadge, DifficultyMetrics and NextAction components render clearly labelled illustrative product data; public pages do not query or mutate practice data. Workflow steps use editorial rows, FAQ uses native details, and section links preserve URL, keyboard focus and scroll position across navigation/reload. Explain current local availability and retention estimates without promising hosted accounts. The 21st CLI was unavailable for search/review; no catalog code or dependencies were installed.

Account phase (2026-10-03): user selected split signup/login with Google and email/password via Supabase, short goal setup and a dedicated extension installation page. Reuse full-page ivory/charcoal canvases, coral/mustard/teal details, typography, buttons and native accessible forms. Mobile stacks the story and form; do not add an outer card. Persist goal/setup steps; distinguish local installation acknowledgement from account pairing. Provide the ZIP and Load unpacked guide now, native video when configured and a future store button/instructions through configuration. The 21st CLI remains unavailable; existing primitives and browser QA provide the implementation basis.

Email-only authentication (2026-10-03): user deferred Google. Signup/login now lead directly into the email/password form with no social button or provider divider. Preserve the split layout, themes, confirmation/recovery flows and short setup.

Extension account connection (2026-10-03): reuse the extension's ivory/charcoal surfaces, typography, form focus tokens and native controls for email sign-in in Settings and the popup. Show the connected Recall email separately from LeetCode status. Disable import before authentication; preserve per-account checkpoints and drafts. Explain session-only sign-in and Chrome restart/reload behavior without promising hosted imports. Supabase tokens remain in trusted session storage. No new permission, library or catalog component is required.

Launch preparation (2026-10-03): user chose Render plus existing Supabase with a free preview URL. Privacy uses the full-page public canvas and numbered editorial sections. Account export/deletion reuse Workspace panels, native dialog, safe initial focus, explicit password/DELETE confirmation, Escape and trigger focus recovery. No new component library is needed; 21st CLI remains unavailable. Clean public URLs preserve existing workspace hash links. Production ZIP URLs are built for the exact hosted origin; local source defaults remain available. Keep queue, classification and approved strength/coverage visuals unchanged. Real deployment and provider configuration remain separate operator steps.
