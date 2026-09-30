# Developer Arcade

Recall uses a charcoal workspace, Arcade Blue interaction accents, semantic difficulty colors, and compact pattern cards. Primary blue is #5B8CFF with #7AA2FF for bright interaction states and #416FE0 for darker accents. The design is implemented with existing Material UI/Emotion primitives and CSS transitions; no additional runtime UI dependencies were added.

## Grounded references

- [SmoothUI Animated Progress](https://21st.dev/community/components/educalvolpz/animated-progress-bar/default): restrained value transitions.
- [Magic UI Circular Progress](https://21st.dev/@dillionverma/components/animated-circular-progress-bar): a selected subpattern indicator, never category mastery.

These are design references, not copied source or installed component packages. Public catalog research informed the approved direction. CLI init and local review ran; CLI search was unavailable without sign-in.

## Interaction and semantics

Coverage and Retention are selectable perspectives, remembered in local storage. Coverage orders category and subpattern rows by largest remaining goal deficit, with catalog order breaking ties. Retention places dated practice first, ordered by weaker Practice Strength and then older practice; dates-unknown experience and unpracticed patterns have separate dashboard sections. Other / needs classification stays last within its evidence group. Both strength bars and coverage rings remain visible; the active view changes emphasis. Featured rows explain their relevance. Search filters every row, including featured categories. Ctrl/Cmd+K focuses search. Selecting a row opens a detail screen with the same perspective switch. Desktop has pattern and goal sidebars; smaller screens use a compact inline goal summary. Scoped problem search uses the existing API. No dashboard recording forms were added.

Bars are Practice strength, not mastery. Every row has a bar. Legacy-only evidence uses pattern-normalized distinct-problem coverage and is labeled “Previous solves count · dates unavailable”; dated practice adds repeat-work and recency evidence. Each indicator uses one subpattern. No XP, achievements, streaks, global counters, recommendations, or study schedules are introduced. All motion respects reduced-motion preferences.

Goal Coverage is visually separate from Practice Strength: it uses a compact circular target-progress ring with credited/target counts, plus explicit Easy/Medium/Hard target counts in expanded views. Practice Strength remains the only long horizontal progress bar.

## Maintenance

Global MUI tokens live in apps/web/src/theme.js. PatternCard, PracticeStrength and DashboardView are reusable components; dashboard-view.js owns pure presentation ordering/search, and Overview owns URL selection, visibility-aware polling and detail navigation. AttemptEditor is connected to history and loaded on demand. Settings supports backup, restore and removed-record recovery. The extension shares the palette and now retains drafts and queues extra Accepted submissions. The older retentionFilters utility remains a tested policy helper; the selectable dashboard uses dashboard-view.js. No migrations or persisted legacy fields were removed.

## Audit implementation — 2026-09-30

History exposes notes, assistance, provenance, timestamps and approach; editor/placement controls use labelled MUI dialogs and radio groups. Global search works from details. Details, patterns and query are bookmarkable and respond to browser Back. Workspace calendar is Asia/Calcutta. Quota breakdown distinguishes solved from credited. Accessible activity tables supplement the visual strip. The side panel focuses its close button, returns focus on close and supports Escape without trapping page focus. Small history/edit/close targets are at least 44px.

The 21st CLI was unavailable for this pass; existing MUI components and design tokens were used. No CLI execution or comprehensive screen-reader certification is claimed. API readiness, origin guards, metadata recovery and continuous scoring are covered by Node/PostgreSQL tests. Main bundle was reduced from roughly 546 kB to roughly 315 kB through lazy loading (total loaded code depends on visited screens).

## Verification — 2026-09-24

- npm run check: lint, all 104 unit tests, and production build passed.
- npm run test:db: all seven isolated PostgreSQL integration tests passed, including preservation, import deduplication and corrections.
- Browser: desktop details, problem histories, assistance/notes, correction dialog (cancelled without changing real data), search empty state, 390px full-width drawer, keyboard opening, Escape dismissal, and no horizontal overflow verified.
- Controlled extension fixture: fresh Accepted opens the dark prompt; offline save retains the selected assistance; successful retry closes the prompt and records once. No real LeetCode submission or database write was made by the fixture.
- Signed-in LeetCode validation was unavailable in the connected browser.
- 21st local review completed with informational hardcoded-color findings only. Public catalog inspiration was adapted to MUI; no component package or hosted generation was used.
- Vite reports a non-blocking main-bundle size warning (~526 kB minified, ~163 kB gzip). The correction editor is loaded on demand.

## Verification — 2026-09-30 perspective switch

- npm run check passed: lint, 132 tests, and production build. Four new policy tests cover perspective ordering, evidence grouping, search and unavailable storage.
- Browser checks passed: Coverage/Retention switching, keyboard activation, remembered view after reload, category/subpattern ordering, first-ranked category search, empty-state recovery and visible paired metrics.
- Dashboard widths checked at 320px, 768px and 1536px; detail view checked at 375px. No horizontal document overflow in those inspected states. Temporary viewport overrides were reset.
- Existing MUI ToggleButtonGroup and project indicators were reused. The 21st CLI was unavailable; no catalog component or generation dependency was introduced.
- Existing production chunk-size warning remains: approximately 557 kB minified, 170 kB gzip. Backend scoring, database records and extension behavior were not changed by this feature.
