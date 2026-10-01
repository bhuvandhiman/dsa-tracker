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
