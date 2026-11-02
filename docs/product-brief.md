# Product brief: why Recall exists

This brief records the product intent that should survive implementation
changes. It is based on the Recall project discussion and the current code. It
distinguishes **the promise** from the present heuristic implementation.

## Product thesis

**Recall helps a learner decide which DSA pattern to practice next, then makes
that choice visible in terms of both coverage and practice history.**

Most DSA trackers make it easy to count accepted problems. Recall's value is the
organization and recommendation layer above that count: when a learner has
solved problems across many topics, which pattern is under-covered or needs
another meaningful practice block? The interface should make the answer
obvious, inspectable, and achievable.

## The problem being solved

An accepted-problem list does not by itself show:

- which pattern each problem contributes to;
- which part of a broad pattern family is still untouched;
- whether a learner has repeatedly and independently practiced a pattern or
  only has old solves with no available dates;
- how interview-oriented goals should differ from broader, deeper study;
- why one pattern currently appears before another;
- which concrete problem to open after choosing a pattern.

Manual tagging every historical solve would make onboarding too expensive and
too error-prone. Treating every LeetCode topic as a separate solve would inflate
coverage. Letting one newly solved problem reorder the whole queue would make
the tool feel erratic. Recall therefore combines conservative classification,
one primary placement per problem, visible coverage goals, practice evidence,
and a queue that requires meaningful progress before it moves downward.

## Who the product is for

The first user is an individual preparing for technical interviews or trying to
build broad DSA understanding. They already solve problems on LeetCode and want
to turn that practice into a manageable plan. Recall starts as a personal
workspace and a Chrome extension; it is not a social leaderboard or a course
marketplace.

## Product value and the core loop

```text
Import past accepted problems
          ↓
See coverage and recorded practice by pattern
          ↓
Open the next ranked pattern and its subpatterns/problems
          ↓
Practice on LeetCode and record assistance + topics used
          ↓
See coverage and practice evidence update; the queue moves only when warranted
```

The first useful moment is a personalized recommendation based on real solves.
That is why the website, extension, LeetCode connection, and import should feel
like one guided journey rather than unrelated setup pages.

## The intended experience

### Dashboard

- A large, central practice-strength/retention tracker should communicate
  something meaningful about the user's recorded practice, not decorate the
  page with an arbitrary number.
- Goal coverage should be expressed as **Easy, Medium, and Hard** progress, not
  one total percentage that hides the mix. Pattern segments show the relevant
  pattern and its progress on hover, focus, or tap.
- The same dashboard should let a learner compare coverage, practice evidence,
  and recommendations. Separate Coverage and Retention screens were considered
  and then rejected because switching views made comparison harder.
- Priority patterns should be visible near the dashboard's main measures and
  lead directly into the pattern details.

### Patterns page

- Patterns are the product's main distinctiveness, so there is a dedicated
  Patterns page separate from the dashboard overview.
- The list uses broad horizontal rows, ordered by the queue, not a wall of
  horizontally tiled cards.
- Each row communicates its position and gives enough reason for the ranking.
  Position, color/focus treatment, and a next-action marker should do the visual
  work; long explanatory paragraphs on every row are not the desired solution.
- Opening a pattern shows an inspectable detail view with its progress,
  difficulty coverage, and subpatterns. Subpatterns expand inline to show their
  problems rather than opening one window per problem.
- Difficulty and last-practiced sorting are deliberately small controls: each
  cycles ascending → descending → normal order. Avoid a large configuration
  panel of filters.
- A problem row should stay simple: problem name, difficulty, and last-practiced
  date. Clicking the problem name opens LeetCode; an always-visible LeetCode
  logo is redundant.
- The problem's overflow menu edits its primary pattern. Choices are the
  available LeetCode-derived candidates plus a searchable **Other** picker for
  manual classification. Reclassifying a problem must not rewrite the pattern
  that was actually recorded for an attempt.

### Practice recording

- Accepted detection opens a compact panel at the LeetCode problem.
- The learner records whether they solved independently, used a hint, or read a
  solution. This is useful evidence because an Accepted result alone does not
  show how the result was reached.
- **Topics used are required.** A problem's page topics are candidates, not proof
  that the learner used them. When those choices are incomplete or wrong, the
  learner can choose **Other** and search the whole pattern catalog.
- The learner should not be asked to confirm an obvious browser timestamp. The
  timestamp is stored as evidence, but is not an extra form choice.
- There should not be a second redundant “practiced approach” selector beside
  topic confirmation. The selected practice classification supplies the unit
  used for practice strength.
- Saving should produce a clear confirmation that identifies the saved
  classification. A failed save should preserve the same recording for a safe
  retry.

## Classification is part of the product promise

The importer's first job is to recognize specific techniques from provider
tags, especially when broad tags are also present. For example, a real Hash
Table topic must not disappear under generic Arrays and leave Hash maps & sets
empty. A problem receives **one stable primary placement** for coverage; its
other provider topics and correction candidates remain available as context.

The intended order of evidence is:

1. A learner's manual placement override, when one exists.
2. A clear specialized provider topic or unambiguous topic combination.
3. A reviewed exact problem identity only where the provider vocabulary cannot
   express Recall's subpattern (notably intervals and DP families).
4. A broad category only when the provider supports that placement.
5. Other / Needs classification when the evidence is insufficient.

Do not infer BFS versus DFS or a DP subtype from a generic Graph or Dynamic
Programming tag. Preserve raw provider topic names, including new/unrecognized
tags, so mappings can improve without losing the source evidence. More detail is
in [classification](import-classification.md), the
[classification evidence ledger](pattern-classification-evidence.md), and the
[data model](data-model.md).

## What the bars and rankings mean

Coverage, current practice strength, and queue priority answer different
questions:

- **Coverage:** how much of the chosen difficulty-balanced problem goal has been
  credited in this pattern.
- **Practice strength:** what the stored evidence says about breadth, repeated
  work, and recency for a pattern. It is a product heuristic, not a measured
  probability that the learner will recall or solve a new problem.
- **Priority:** which pattern deserves attention next under the chosen profile,
  its remaining goal gap, and its committed practice evidence.

Coverage remains earned even if practice recency declines. Imported solves
without dates help establish experience/coverage but do not fake a recent
practice event. Strength can fade while a person is away; there is no daily
check-in, streak, countdown, or claim that Recall observes the learner every
day. A meaningful block of distinct problems is required before completed
practice can release the queue's ranking gate. See
[current strength and queue policy](retention.md),
[research limitations](retention-research.md), and
[goal policy evidence](goal-policy-evidence.md).

## Visual direction

The user supplied two learning-dashboard references. The chosen direction takes
the **warm palette and expressive type** from the EduMaster reference and the
polished, energetic feel of both; it does **not** copy their dashboard layouts.
The user explicitly rejected the card-within-a-card treatment and dense tiled
horizontal card grids. Recall should use its full page, emphasize hierarchy,
use distinctive bars and restrained accent colors, and make pattern rows the
primary browsing object. The CSS variables are in
[`apps/shared/design-tokens.json`](../apps/shared/design-tokens.json) and
[`apps/web/src/tokens.css`](../apps/web/src/tokens.css); the design notes are in
[`.21st/DESIGN.md`](../.21st/DESIGN.md).

The moon/sun control switches the whole site between light and dark themes.
Visual interest should come from typography, spacing, purposeful color, and
clear progress visuals rather than extra settings or decorative cards.

## Website and account experience

The public site is the front door: Home explains the product, About explains
the idea, Privacy describes data handling, and email/password signup creates a
Recall account. A short setup captures focus and coverage target. Extension
installation is a dedicated page because the current distribution is a local
ZIP/Load unpacked process; a video and Chrome Web Store link can be added later.

Supabase Auth is the hosted email/password provider. Google login was deferred.
The desired account flow is one Recall website login per Chrome profile. The
extension receives a short-lived website access token through a same-origin
handshake rather than showing a second password form. LeetCode remains a
separate signed-in browser account. See [account setup](account-setup.md),
[website-to-extension login](website-extension-login.md), and the
[launch phases](public-site.md).

## Product boundaries: what Recall is not trying to do

- It is not a leaderboard or a generic all-time solve counter.
- It does not treat every provider topic as a separate credited solve.
- It does not claim that one Accepted submission proves independent learning.
- It does not invent dates/assistance for historical imports.
- It does not promise that a heuristic score is a literal recall percentage.
- It does not need a daily streak or due-date calendar to keep the queue useful.
- It should not add many switches, filters, independent subpages, or text that
  users must decode before taking the next action.
- It should not keep expanding a phase after its agreed work is complete; work
  is planned in bounded phases so the user can adjust between them.

## Known intent/implementation mismatch

The user asked to remove the standalone History page. The current source still
has a History route and nav entry (`apps/web/src/App.jsx` and
`apps/web/src/History.jsx`). This brief preserves the product decision and flags
the source mismatch for a separate product change; the documentation update did
not remove or redesign that route.

