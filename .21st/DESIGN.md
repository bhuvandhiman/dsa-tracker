# Developer Arcade

Recall uses a charcoal workspace, mint interaction accents, amber context, and compact pattern cards. The design is implemented with existing Material UI/Emotion primitives and CSS transitions; no additional runtime UI dependencies were added.

## Grounded references

- [SmoothUI Animated Progress](https://21st.dev/community/components/educalvolpz/animated-progress-bar/default): restrained value transitions.
- [Magic UI Circular Progress](https://21st.dev/@dillionverma/components/animated-circular-progress-bar): a selected subpattern indicator, never category mastery.

These are design references, not copied source or installed component packages. Public catalog research informed the approved direction. CLI init and local review ran; CLI search was unavailable without sign-in.

## Interaction and semantics

Search matches category and subpattern names without altering server ordering. Ctrl/Cmd+K focuses search. Experienced and coverage-gap filters narrow the view. The dashboard is a single vertical list of full-width pattern rows; selecting one opens a dedicated full-width detail screen on every device. Scoped problem search uses the existing API. Histories retain assistance, source, notes, placement corrections, and revision-checked editing/removal. No dashboard recording forms were added.

Bars are Practice strength, not mastery. Every row has a bar. Legacy-only evidence uses pattern-normalized distinct-problem coverage and is labeled “Prior solves · date unknown”; dated practice adds reinforcement and recency. Each indicator uses one subpattern. No XP, achievements, streaks, global counters, recommendations, or study schedules are introduced. All motion respects reduced-motion preferences.

## Maintenance

Global MUI tokens live in apps/web/src/theme.js. PatternCard and PracticeStrength are reusable components; Overview owns selection, filtering, polling and detail navigation. AttemptEditor is loaded on demand. Extension popup, Settings and isolated capture panel share the same palette, with capture behavior unchanged.

## Verification — 2026-09-24

- npm run check: lint, all 104 unit tests, and production build passed.
- npm run test:db: all seven isolated PostgreSQL integration tests passed, including preservation, import deduplication and corrections.
- Browser: desktop details, problem histories, assistance/notes, correction dialog (cancelled without changing real data), search empty state, 390px full-width drawer, keyboard opening, Escape dismissal, and no horizontal overflow verified.
- Controlled extension fixture: fresh Accepted opens the dark prompt; offline save retains the selected assistance; successful retry closes the prompt and records once. No real LeetCode submission or database write was made by the fixture.
- Signed-in LeetCode validation was unavailable in the connected browser.
- 21st local review completed with informational hardcoded-color findings only. Public catalog inspiration was adapted to MUI; no component package or hosted generation was used.
- Vite reports a non-blocking main-bundle size warning (~526 kB minified, ~163 kB gzip). The correction editor is loaded on demand.
