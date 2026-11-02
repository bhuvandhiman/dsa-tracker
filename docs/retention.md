# Pattern progress, practice strength, and queue priority

This is the current contract for the pattern bars and recommendation order.
All numeric scores are Recall policy estimates, not calibrated probabilities
that someone will remember or solve an unseen problem. The main implementation
is [`retention-policy.js`](../apps/api/src/retention-policy.js),
[`practice-policy.js`](../apps/api/src/practice-policy.js), and
[`goal-policy.js`](../apps/api/src/goal-policy.js); the browser presentation is
in [`PatternMetrics.jsx`](../apps/web/src/PatternMetrics.jsx) and
[`dashboard-model.js`](../apps/web/src/dashboard-model.js).

## The three signals

| Signal | Answers | Main inputs |
| --- | --- | --- |
| **Goal coverage** | How much of the selected problem plan has this pattern covered? | Unique primary placements, difficulty, profile, target, and per-pattern quotas. |
| **Practice strength** | What experience, repeat work, and dated practice has Recall observed for this pattern? | Distinct solves, recorded attempts/topics, assistance, dates, and elapsed time. |
| **Queue priority** | Which pattern should the learner consider next? | Remaining goal gap plus the pattern's committed practice weakness, weighted by the selected goal. |

These signals appear together because the learner needs to compare them, but
they are not the same score. Focus badges communicate preparation emphasis;
the strength bar does not become fuller because a pattern is important.

## What the visible strength bar means

The bar is one practice-strength estimate split into its two actual
contributions:

- **Experience** (coral) is the persistent baseline from solve breadth and
  reinforced revisits.
- **Recent practice** (mustard) is the added contribution from dated observed
  events. It fades with elapsed time.

The colored segments sum to the current strength when dated evidence exists.
Only the displayed label is rounded. When a pattern has experience but no
valid dated events, the bar can show its experience fill while the percentage
remains unassessed; it must not imply measured retention. With no experience,
it prompts the learner to record practice. The `Other / needs classification`
row has no scored bar.

The dashboard-wide tracker is an unweighted average of the assessed category
strengths. Categories with no dated assessment do not lower that average;
the UI reports assessed and undated coverage separately. Each category's
strength is calculated from its own category-level distinct evidence. This is
a summary of the evidence Recall has, not a universal mastery score.

### Strength calculation

Practice is grouped by the classified practice unit, which can differ from a
problem's primary placement. For each unit, valid events are ordered by time.
The model excludes missing, malformed, and future dates from dated evidence.
For the same problem
on the same `Asia/Calcutta` practice day, it keeps the strongest assistance
evidence (and the latest event when evidence is tied). This prevents retries
on one day from looking like several independent practice days.

Let `n` be distinct solved problem identities, `T` the pattern's configured
breadth target, and `r` the weighted revisit evidence:

```text
breadth B      = 1 - exp(-n / T)
reinforcement D = 1 - exp(-r / 10)
experience E   = 100 * (0.5 * B + 0.3 * D) / 0.8
strength       = E + (100 - E) * 0.2 * recency R
```

The denominator normalizes the persistent breadth/reinforcement weights
(0.5 + 0.3) to a 0–100 experience baseline. Breadth targets vary by pattern
because broad families need more distinct examples than narrow specialist
techniques; these targets are product defaults, not research-derived mastery
thresholds.

For a dated event, recency is updated from earlier recency after exponential
decay, then the event contributes a fraction of the remaining room. The
default decay half-life is 30 days. Current recovery contributions are
independent `0.6`, hint `0.4`, solution-assisted `0.2`, and unknown `0.3`.
Unknown assistance can therefore contribute modestly to dated recency when a
real date exists, but it does not count as independent work or earn a practice
block. Missing dates never refresh recency. The experience baseline persists
while only the recency contribution fades.

For a revisit, reinforcement adds independent `1`, hint `0.5`,
solution-assisted `0.2`, or unknown `0`. The first dated event for a problem
does not count as a revisit. Accepted status by itself does not tell Recall
whether the learner solved independently; the extension asks the learner.

The 30-day half-life, weights, and per-pattern breadth targets are adjustable
product assumptions. Research on retrieval and spacing motivates measuring
delayed practice, but does not set these DSA-specific values. See
[`retention-research.md`](retention-research.md) for evidence and limitations.

### What imports can and cannot say

Imported accepted problems count once toward primary-placement coverage and
experience breadth. A historical solve with no provider date does not create
a dated event, recency, revisit, or practice block. When LeetCode supplies a
real date in the limited recent-submission import, that dated event may inform
recency, but its assistance remains unknown and cannot earn a block. Imported
records do not overwrite a learner-confirmed attempt for the same
problem/day/submission.

## Goal coverage and extra solves

The selected profile is **Interview Focused** or **Deep Understanding**. The
selected target is 300, 500, or 1000 distinct problems. `goal-policy.js`
allocates each target across categories, subpatterns, and Easy/Medium/Hard
according to versioned Recall weights. Its target matrix is product policy,
not an industry standard.

Each problem receives at most one coverage credit through its effective
primary placement. Difficulty quotas are separate: extra Easy problems do not
fill missing Medium coverage, and one subpattern's surplus does not fill a
sibling's gap. The interface displays raw actual solves such as `20/16`, while
bar fill uses credits capped at the quota. A surplus still contributes to
experience; it simply cannot erase an unrelated gap or create extra goal
credits. Unknown difficulty remains visible but is not guessed into a bucket.

Manual primary-placement corrections reattribute coverage. Recorded practice
stays under the confirmed topic/unit used during that attempt, so a later
classification correction does not rewrite the learner's practice history.

## How the queue ranks patterns

For each goal-scored category or subpattern:

```text
gap           = remaining credited goal problems
target        = that category/subpattern's allocated goal
practiceNeed  = committed weakness from 0 to 1
raw attention = 0.65 * gap + 0.35 * target * practiceNeed
```

Practice weakness is the inverse of the API's committed practice-strength
score, normalized to 0–1. If there is no practice evidence, the pattern starts
with full practice need. The queue uses evidence committed through the last
completed meaningful practice block, together with historical solve breadth;
partial attempts still update the visible strength bar immediately. Therefore,
one problem can improve visible evidence without forcing the learner to
switch patterns after every solve.

The profile shapes the category and subpattern quotas, so interview-relevant
patterns receive more goal space. Coverage contributes 65% of raw attention;
practice weakness contributes 35% and remains relevant after a goal is
complete. These weights are Recall policy, not measured interview-frequency
statistics. The API persists a queue snapshot so equal or tiny changes do not
cause distracting movement. Scores are compared in two-point bands; catalog
order breaks ties. A new score can raise a pattern's urgency immediately,
while lowering its position waits for a release condition below.

### Focus badges

Focus badges are a separate preparation-emphasis signal. A category's
importance is its selected profile weight divided by the largest category
weight in that profile. A subpattern multiplies its parent's ratio by its
target relative to its largest sibling target. Current tiers are high at
`0.5` or above, medium at `0.25` or above, and lower below `0.25`. The UI
labels these **High focus**, **Medium focus**, and **Lower focus**. Practice
history cannot change the badge; switching the selected goal profile can.
These thresholds describe Recall's own allocations and do not claim an
empirical probability of an interview question.

## Why and when the queue moves down

The user explicitly wanted meaningful work before a pattern loses its place.
Every coverage credit and partial practice update is still visible, but a
small gain alone does not lower the pattern's own committed ranking score.
Coverage and practice provide separate release routes:

1. **Coverage route:** credits accumulate from the persisted baseline. Four
   credited goal problems release the gate; if fewer than four credits remain,
   completing the remaining goal releases it. Bulk gains carry any remainder
   into the next block. Extra solves above a difficulty cap do not earn
   additional credits.
2. **Practice route:** one block completes with at least four weighted
   practice credits from at least four different problems in one subpattern.
   Independent work is `1`, hint-assisted work `0.5`, solution-assisted work
   `0.2`, and unknown assistance `0`. Each problem identity contributes its
   strongest pending evidence once. Repeating one problem cannot finish a
   block; pending work from sibling subpatterns is not pooled.

Completing either route permits the API to recalculate the committed ranking;
it does not guarantee that the row moves down because other patterns can also
change. A pattern's own score can rise immediately when need increases.
Correction, removal, restoration, profile/target change, or policy-version
change rebuilds derived queue memory as appropriate. Recorded attempts,
classification, notes, and selected goal settings are not rewritten by a
policy-version change.

The database-backed snapshot is `workspace_goal.queue_snapshot`, introduced
by migration 011. It is derived state, not source evidence. Its correction
fingerprint catches changes to dates/assistance even when completed-block
count stays the same. Invalid snapshot numbers are discarded rather than
allowed to freeze or poison ordering. Details and regression outcomes from the
point-in-time threshold audit are in [`threshold-audit.md`](threshold-audit.md).

## Holds and the meaning of "retention"

A completed practice block pauses recency decay for three days. Each later
block completed on a different local practice day extends the hold by two
days, capped at fourteen. Same-day blocks do not extend it. The hold is a
stability choice, not a research-backed revision schedule. After the hold,
recency decays naturally; Recall does not claim to watch the learner daily,
does not create a daily streak, and does not promise an exact next revision
date. The queue is refreshed from stored evidence when the website loads or
practice changes.

## Why the policy exists

The product needs both interview preparation and personal retention. If
interview importance alone controlled the order, practice evidence would not
matter. If one recent solve alone controlled the order, a core interview
pattern could disappear from view and the queue would feel erratic. The
versioned goal quotas and 65/35 queue score preserve both signals; persisted
release gates make progress visible while requiring a meaningful amount of
work before a lower rank is committed.

This is intentionally simpler than a trained memory model or a spaced-review
scheduler. Recall does not yet collect enough explicit delayed, independent
assessments to calibrate personal probabilities. It should not describe the
bar as a literal percentage of knowledge retained. The detailed source review
and proposed future measurements are in
[`retention-research.md`](retention-research.md).

## Change control

Goal allocations are versioned as `2026-10-02.v8`. Practice-strength
coefficients and hold defaults live in `retention-policy.js` and
`practice-policy.js`. If any of these rules change, update this document,
[`goal-policy-evidence.md`](goal-policy-evidence.md), the relevant policy
version and regression tests, and the short UI explanation in
[`LiveDashboard.jsx`](../apps/web/src/LiveDashboard.jsx). Historical practice
must not be silently rewritten. The exact current scoring sources are linked
at the top of this document; dated audits below this policy describe earlier
states and must not override it.
