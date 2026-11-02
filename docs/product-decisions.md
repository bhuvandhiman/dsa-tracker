# Product decision record

This is a durable record of decisions from the Recall project conversation.
It favors the user's latest direction when an idea changed, and labels known
gaps between that direction and the code. It is not a substitute for checking
the current implementation before changing behavior.

## Current decisions

| Decision | Why it was chosen | Current implementation / evidence |
| --- | --- | --- |
| Make **patterns** the main differentiator. | A raw solved total does not say what to work on next; pattern-level gaps and strength are the product's core value. | `/patterns`, ranked category and subpattern rows, inline problem details, and the dashboard's top-pattern recommendations. See `LiveDashboard.jsx`, `PatternOverview.jsx`, `PatternMetrics.jsx`. |
| Put coverage and practice strength together on one dashboard. | Separate views made it difficult to compare what is covered with what remains weak or stale. The user first considered a selectable split, then settled on one combined view. | The dashboard contains the central practice-strength bar, priority patterns, and three difficulty coverage bars. |
| Make the main retention/practice tracker large and explainable. | It should represent a meaningful signal and serve as the visual anchor, not a tiny decorative stat. | The overview bar averages assessed dated pattern scores; details expose an explanation. The score is heuristic, not a measured probability. |
| Show goal coverage as Easy, Medium, and Hard. | A single goal percentage hides whether the user's practice is unbalanced. | `PatternOverview.jsx` renders three difficulty bars with pattern segments and accessible hover/focus/tap details. |
| Rank patterns from the actual goal and practice evidence. | The queue is the core reason to use Recall; catalog order alone or solved totals alone would not answer “what next?”. | `goal-policy.js`, `retention-policy.js`, queue snapshots in migration 011, and `dashboard-model.js` determine the displayed order. Exact current policy: `retention.md`. |
| A single solve must not make the queue bounce. | Users should not have to jump between patterns after each problem. Progress may show immediately, but downward ranking movement requires a respectable amount of work. | The API persists queue anchors and releases them after coverage/practice thresholds. A threshold allows recalculation; it does not guarantee a rank change versus other patterns. |
| Show interview focus and individual practice/retention as different signals. | Interview importance can be high even when the person has recently practiced; individual recency should not erase relevance. | Goal profiles and focus badges supply importance; strength supplies learner evidence. The two are kept separate in the model and combined only for queue attention. |
| Preserve rank context visually without explaining every row in prose. | The first item should look like the next action, while too much instructional copy becomes noise. | Ordered rows, rank numbers, focus treatment, progress bars and a next-action mark communicate position. Explanations live behind compact disclosure controls. |
| Use long pattern rows and expandable inline details. | Patterns should not look like horizontal tiles of cards; the user wanted a dedicated Patterns page and direct drill-down. Problems should not open a separate window for every subpattern. | `/patterns` list and `/patterns/:slug` detail routes; subpattern problem rows expand in place. |
| Keep sorting to two simple three-state controls. | Many filters/configurations made the page harder to use. | Difficulty and last-practiced sorting each cycle ascending, descending, normal. See `SubpatternProblems.jsx`. |
| Clicking a problem opens LeetCode; remove the always-on LeetCode logo. | A logo beside every row is redundant when the title itself is the useful link. | Problem title row is the external LeetCode destination; the menu handles classification. |
| Let users correct a problem's **primary pattern** from its overflow menu. | Automated metadata needs an escape hatch, but a general-purpose multi-filter editor is not wanted. | Candidate patterns are based on provider evidence; a searchable Other picker supports manual placement. Manual placement remains distinct from recorded attempt units. |
| Prefer specific provider tags before broad categories. | It prevents clear evidence such as Hash Table from being swallowed by Arrays and leaving a useful pattern empty. | `leetcode-topics.js` normalizes provider vocabulary; `pattern-catalog.js` orders candidates; provider topics are preserved in storage. See `import-classification.md`. |
| Keep classification data-driven and robust, with small reviewed identity exceptions. | Enumerating every problem by hand would create maintenance breakpoints; provider tags do not express all Recall subpatterns. | Broad dictionary + explicit specificity rules handle ordinary classification. Curated exact problem identities refine DP/Intervals only where provider vocabulary is insufficient. |
| Require the learner to confirm topics used. | Import tags describe possible approaches; they do not prove what the learner used. Classification is central to the product. | The Accepted prompt requires topic selection; the Other option opens search across the catalog. The API stores selected topics and one effective practice unit. |
| Remove the extra “practiced approach” control and visible browser-time control. | These fields were confusing or redundant for the learner. Topics used already provide the classification needed by the model; the browser owns the timestamp. | The prompt asks how the learner solved it and what topics were used. The timestamp is recorded internally; users are not asked to type the obvious browser time. Legacy database column names remain for compatibility. |
| Do not turn imports into fabricated practice. | Historical accepted problems are not enough to establish when/how the user solved them. False recency damages trust. | Bulk import records historical coverage, then optionally available recent submission dates (up to 20). Unknown date/assistance stays unknown. |
| Use a stable bar with an earned practice threshold. | A bar that disappears or falls sharply after a single session is discouraging and does not match the intended “keep practicing until a threshold” experience. | Four distinct problems and four weighted credits form a block. A completed block earns a short hold; spaced blocks extend it up to a cap. See `retention.md`. |
| Do not promise a universal revision date or daily observation. | Recall does not observe the learner every day and the research does not establish one optimal DSA calendar. | No daily check-in, streak, revision countdown, or claim that Recall knows exact recall probability is required. The queue updates from recorded evidence when the app is used. |
| Keep one website login for both website and extension. | A second credential screen inside extension setup is friction and feels like a separate account. | The website shares only its short-lived access token through an origin/frame/nonce-checked bridge; its refresh token remains website-owned. |
| Use Supabase email/password for hosted accounts; defer Google login. | This is the chosen first account flow and keeps signup configuration manageable. | `AUTH_MODE=supabase`; local single-workspace mode remains supported. Google provider login is not in the current UI. |
| Keep hosted distribution low-cost until launch is ready. | The owner does not yet have a domain or Chrome Web Store budget and wants to finish the product first. | Render's free `onrender.com` service and downloadable ZIP are prepared; custom domain/video/store URLs can be added later. Manual deploy is required by `render.yaml`. |
| Keep practice records recoverable and account-scoped. | Trust depends on a user being able to inspect/export/delete their own records without affecting LeetCode. | Backup/restore, account export/deletion, private schemas, and server-side authorization are implemented; see `account-setup.md` and `deploy-render.md`. |

## Direction changes, in order

These changes are important because older planning documents may describe an
idea the user later rejected:

1. **Coverage vs. retention:** first discussed as selectable views; later
   changed to one comparable dashboard with both signals.
2. **Visual inspiration:** screenshots informed palette, type, energy and
   hierarchy, not the reference dashboards' layout. The user rejected a card
   inside an outer card, a tiled card wall, and unnecessary pattern cards.
3. **Pattern details:** first explored separate pattern screens and then
   settled on a dedicated Patterns page with long rows and inline expandable
   subpattern problems.
4. **Priority metric:** a plain priority/gap number and vague hover explanation
   did not make the ranking understandable. The chosen design separates goal
   focus from the learner's practice evidence, shows coverage by difficulty,
   and keeps the reason close to the item.
5. **Retention decay:** early sketches proposed fixed revision dates/checks.
   The later product decision is to update only from observed attempts, let
   recency decay while the learner is away, and avoid daily reminders or
   fabricated observations.
6. **Classification UI:** provider topics began as optional metadata; the user
   later made topic confirmation required and requested a searchable Other
   picker because reliable classification is core to the app.
7. **Authentication:** Google was considered during account planning, then
   explicitly deferred. Email/password through Supabase is the active scope.
8. **Import performance:** the read path was already fast; sequential database
   writes made hosted saves slow. Writes were changed to idempotent bulk batches
   while preserving recovery checkpoints and record identity.

## User collaboration preferences

- Work in bounded phases so design changes can be incorporated without
  redoing unrelated parts. Stop when the agreed phase is complete; do not invent
  extra scope just because the user says “next phase.”
- Explain meaningful design choices before implementing a direction when the
  choice changes the product experience. Continue clear implementation work
  once the user has selected the direction.
- For a completed feature, provide a concise one-line commit message. A commit
  message is not permission to commit or push; do that only when requested.

## Known mismatch to resolve separately

The user requested that the History page be removed entirely. The current code
still exposes a History navigation link, route and page component. This is a
real product/implementation mismatch, not a new recommendation. Resolve it in a
separate focused change and update this record when the source matches the
decision.

## Change control for product assumptions

The exact profile weights, goal allocations, strength coefficients, block
thresholds, time half-life, rank bands and holds are **policy defaults**. The
user's motivation is to produce a queue that is stable, clear, achievable, and
useful in interview preparation or deep study. The numbers are implementation
choices, not direct quotations from research. If they change, update together:

1. `apps/api/src/goal-policy.js`, `practice-policy.js`, and/or
   `retention-policy.js`;
2. `docs/retention.md` and `docs/goal-policy-evidence.md`;
3. tests that fix the intended boundaries;
4. the UI explanations so they still describe the exact calculation.

