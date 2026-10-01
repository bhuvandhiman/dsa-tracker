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
- [ ] User feedback checkpoint before expanding the interface.

This phase is a visual shell. Cards are illustrative categories, not the complete
API catalog; they are not yet clickable. The switch changes explanatory content,
not practice ordering. No metrics or activity are fabricated.

## Phase 2 — live coverage and retention
- [ ] Connect existing read-only APIs.
- [ ] Render the complete pattern catalog, goal coverage, and practice strength.
- [ ] Add loading, error, empty, and undated-experience states.
- [ ] Implement ordering, search, and goal controls.
- [ ] Review checkpoint.

## Phase 3 — detailed website workflows
- [ ] Pattern details and scoped problems.
- [ ] Practice history, editing, filters, and corrections.
- [ ] Workspace settings, backup, restore, and removed-record recovery.
- [ ] Review checkpoint.

## Phase 4 — extension consistency and final QA
- [ ] Carry approved tokens into extension controls and recording panels.
- [ ] Preserve draft, retry, import, and Accepted capture behavior.
- [ ] Verify responsive layouts, keyboard interaction, and real workflows.
- [ ] Final review checkpoint.

Do not expand into the next phase until the user has had the current phase to review.
API contracts, database data, and extension behavior remain preserved.
