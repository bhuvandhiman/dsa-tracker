# Frontend rebuild

## Selected visual direction
Use the second inspiration image's warm ivory, coral, mustard, and teal palette
and bold rounded typography. Both images inform softly rounded cards, playful
topic labels, and restrained textures. Create a DSA-specific layout rather than
copying either reference's layout. Coverage and Retention remain central.

## Phase 1 — visual foundation and dashboard shell
- [x] Shared color, spacing, radius, and typography styles.
- [x] Brand and keyboard-accessible top navigation.
- [x] DSA introduction with an original code/book illustration.
- [x] Coverage/Retention switch and descriptive states.
- [x] Three illustrative pattern cards; no invented practice counts.
- [x] Responsive layout, focus states, and reduced-motion handling.
- [x] User revision: full-page ivory canvas, without an outer card or background gutters.
- [x] User revision: top-bar moon/sun control, dark palette, and persisted theme preference.
- [x] Lint, existing tests, and production build.
- [x] Browser verification at 320, 376, 769, 1024, and 1440 CSS pixels: no horizontal overflow, click/keyboard perspective changes, and pattern anchor navigation. No browser errors or warnings.
- [x] User reviewed Phase 1, revised the frame and theme control, and requested Phase 2.

This phase is a visual shell. Cards are illustrative categories, not the complete
API catalog; they are not yet clickable. The switch changes explanatory content,
not practice ordering. No metrics or activity are fabricated.

## Phase 2 — live coverage and retention
- [x] Connect the existing retention API, with cancellation, timeout, retry, and visibility-aware refresh.
- [x] Render all 17 categories and their subpatterns, goal coverage rings, practice strength, and difficulty credit.
- [x] Add loading, first-load errors, stale snapshots, retry recovery, empty workspaces, no-goal, undated-experience, and unpracticed states.
- [x] Implement category/subpattern search and goal save controls. Current revision uses consistent catalog ordering, with Other outside coverage and last.
- [x] User reviewed Phase 2 and requested the next phase.

Validation: lint, 125 tests, and production build pass. Browser verification covers search/clear, subpattern expansion, perspective persistence, saving the unchanged current goal, isolated empty/error/recovery cases, both palettes, and responsive widths near 320/375/768/1024/1440 CSS pixels (one-pixel rounding tolerance).

Phase 2 layout revision: the main dashboard now keeps overview and goals only. A dedicated Patterns route displays full-width rows; opening a row navigates to a separate subpattern detail panel. Detail URLs survive reload, and returning preserves search context. No inline subpattern accordion or tiled pattern grid remains.

Unified view revision: removed Coverage/Retention switching, its saved preference, and mode-specific explanatory cards. Both metrics stay visible together. Patterns and subpatterns use catalog order to keep comparison consistent. The dedicated Patterns list and detail routes remain.

## Phase 3 — detailed website workflows
- [x] Current revision: subpatterns expand scoped problems inline. Difficulty and Last practiced buttons toggle ascending/descending server ordering before pagination. Problem notebooks also expand inline; the separate Problems page and its configuration filters are removed.
- [x] Problem history distinguishes imported read-only submissions and undated solves. Corrections support problem metadata, primary placement, recording date, assistance, patterns, approach, and notes.
- [x] History search and assistance filters apply across all recordings before pagination. Existing unfiltered API requests retain their response shape.
- [x] Workspace information, backup download, JSON restore preview, explicit restore action, recoverable recording removal, and removed-record recovery.
- [x] User reviewed Phase 3 and requested the next phase.

Validation: lint, 135 tests, and build pass. PostgreSQL integration checks verify filtered history and pagination in a generated test schema. Browser tests use an isolated workspace for metadata corrections, recording corrections, removal/recovery, backup download, and restore. Mobile pages and expanded editors fit 320px. Live library reads verify scoped browsing without changing practice records.

## Phase 4 — extension consistency and final QA
- [x] Carry approved ivory/coral/teal/mustard tokens and typography into the popup, import page, recording panel, and success notice.
- [x] Add accessible moon/sun controls with a shared saved extension theme and listener cleanup when recording panels close.
- [x] Preserve draft, retry, import, and Accepted capture behavior.
- [x] Verify responsive layouts, keyboard interaction, persistence, and workflows with real extension scripts in isolated browser fixtures.
- [ ] Verify live Accepted capture/import in the user's signed-in Chrome profile after reloading the extension. This profile is unavailable through the current browser connection.
- [x] Final development review: inline browsing revision, automated checks, PostgreSQL sorting integration, and responsive browser QA.

Validation: lint, 139 tests, and production build pass. Browser checks verify Run suppression, fresh Accepted capture, Escape dismissal, draft restoration, offline retry with locked choices, queued submissions, persisted themes, setup import, and 320px layouts. `npm run test:capture` and `npm run test:extension-ui` provide reproducible fixtures without real submissions or database writes.

All four planned development phases are implemented. There is no Phase 5. Stop after completing the requested revision; the signed-in Chrome check above remains a manual validation item.
API contracts, database data, and extension behavior remain preserved.

Compact browsing revision: whole subpattern summaries toggle problems. Rows show name, difficulty, external LeetCode icon, date, and ellipsis; notebooks no longer open from problem rows. Sorting resides in column headings and cycles ascending → descending → normal (original newest-added order), before pagination. Ellipsis provides only Edit pattern; choices use stored provider topics and curated mappings, with a final manual catalog choice. Placement-only writes preserve metadata and recordings. This refines the completed four phases and introduces no new phase.
