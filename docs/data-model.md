# Domain and data model

This guide explains what Recall counts and why similar-looking numbers may
differ. The database schema is introduced and evolved by the numbered SQL
files in [`apps/api/migrations`](../apps/api/migrations). Runtime classification
is defined in [`pattern-catalog.js`](../apps/api/src/pattern-catalog.js),
provider vocabulary in [`leetcode-topics.js`](../apps/api/src/platforms/leetcode-topics.js),
goal allocation in [`goal-policy.js`](../apps/api/src/goal-policy.js), and
strength/queue evidence in [`retention-policy.js`](../apps/api/src/retention-policy.js).

## Four separate things that must not be conflated

For a LeetCode problem, Recall may know:

1. **Provider topics:** what LeetCode labels the problem with (for example
   `Array`, `Hash Table`, or `Dynamic Programming`). These raw names are saved
   so the app can preserve evidence and handle new vocabulary later.
2. **Primary placement:** the one pattern used to browse and credit this
   problem in coverage. A manual override wins; otherwise the deterministic
   classifier chooses the strongest supported candidate.
3. **Candidate patterns:** other plausible patterns supported by the tags or a
   reviewed classification. These help the user correct placement but do not
   turn one problem into several solved problems.
4. **Practice unit:** the single classification selected for a recorded attempt
   and used for that attempt's practice-strength evidence. It can differ from
   the problem's primary placement. The attempt also retains the selected topic
   list and its origin.

The UI's required **topics used** selection informs the practice unit. The
user's choice is evidence about the way the problem was practiced; a problem's
LeetCode tags alone are not. Historic database fields named `approach_source`,
`practice_unit`, and `attempt_patterns` preserve this distinction and provide
backward compatibility. Do not interpret the schema word “approach” as a
separate extra user control.

## Stored entities

| Entity / table | Meaning | Important behavior |
| --- | --- | --- |
| `patterns` | Supported category/subpattern slugs and display names. | Seeded/validated against the API catalog. Unknown provider topic names do not become user-visible catalog entries automatically. |
| `problems` | One external problem identity plus title, URL, difficulty, and nullable raw provider topics. | Unique by `(platform, external_id)`. `provider_topics = NULL` means old/unknown metadata; an empty array means verified no topics. |
| `problem_patterns` | Supported pattern associations discovered for a problem. | Multiple candidates can be retained, but coverage uses one effective primary placement. |
| `problem_placements` | Optional manual primary placement override. | Can choose any valid catalog unit; changing it changes browse/coverage classification but does not rewrite past attempts. |
| `historical_solves` | Accepted problem identity imported without a known practice date. | Counts for coverage and experience breadth. It carries no invented assistance, notes, or timestamp of solving. `imported_at` is import bookkeeping only. |
| `attempts` | A user-confirmed or manually recorded practice event. | UUID identity; assistance, notes, attempted time, practice unit, selected topics, capture source, submission identity, provenance, revision and soft-delete state are retained. |
| `attempt_patterns` | Topic/pattern evidence attached to an attempt. | Supports existing records and filters. It is not a command to credit a single attempt to every stored tag. |
| `imported_submissions` | Recent LeetCode accepted submissions with provider submission IDs and real available dates. | Assistance is unknown. Duplicate identities/days are prevented from masquerading as extra independent practice. |
| `legacy_imports`, `recent_imports` | Durable IDs/status for accepted-problem and recent-date import runs. | A repeated/retried run is idempotent and bound to its original LeetCode username. Schema columns still named `installation_id` currently identify import runs. |
| `workspace_account` | Local workspace's bound LeetCode username. | Prevents silently combining two LeetCode accounts in one workspace. Hosted workspace ownership is the verified Supabase UUID/schema. |
| `workspace_goal` | Selected goal profile/target and derived queue snapshot. | The snapshot stabilizes ordering; it is not source evidence. A profile, target, policy, or evidence correction can invalidate/rebuild it. |
| `retention_preferences` | Early retention preferences table. | Present in migration history for compatibility; do not assume it controls the current queue without checking active repository reads. |

Additional operational owner tables/state are managed by `owner-store.js` and
`owner-operations.js`; they are service telemetry and access-control records,
not part of a learner's pattern evidence. Account deletion has a durable
cleanup ledger so a failed Auth/database cleanup can resume without reopening
the user's workspace.

## What each visible count means

### Distinct primary solves

A problem counts at most once under its effective primary placement, even if it
has several provider topics, has been imported more than once, or has several
recorded attempts. A manual placement changes which single pattern receives
that coverage. This is why Recall counts will not match the sum of all LeetCode
topic counts: LeetCode intentionally counts one problem in each applicable tag.

### Actual solves and goal credits

`actual` is the uncapped number of solved identities for the pattern/difficulty
where difficulty is known; unknown-difficulty identities are reported
separately. `credited` is the amount that fills the selected goal allocation
and is capped at that allocation. A pattern can therefore show, for example,
more actual solves than its target while contributing no more than its goal
credits there. Surplus in one pattern does not fill an unrelated pattern's
deficit. Both numbers are useful: one describes history, the other describes
progress through this plan.

Accepted history and dated accepted submissions are unioned by problem
identity. Attempts also establish solved identities. The API deduplicates the
sets before building coverage; imports do not manufacture repeated solve
credits.

### Dated and undated practice evidence

- **Dated practice** comes from recorded attempts and the limited set of recent
  imported accepted submissions where LeetCode supplied a real date.
- **Undated experience** comes primarily from the accepted-problem import.
  It can count toward breadth/coverage, but it cannot refresh recency or prove
  a successful spaced check.
- If an actual attempt already represents the same problem/date/submission, an
  imported duplicate is excluded from the practice event stream.
- Missing/future timestamps do not release a practice block. One problem on the
  same local day supplies at most one daily evidence event; the strongest
  assistance evidence is retained for that day.

This distinction explains labels such as “previous solves,” “dated practice,”
“dates unknown,” and “not assessed.” It is intentional rather than a lost
count.

## Classification lifecycle

1. The LeetCode adapter extracts validated problem identity, title, difficulty,
   URL, and provider topics.
2. `mapTopics` normalizes topic names for dictionary lookup while the original
   provider labels remain stored.
3. `candidateUnits` orders specific techniques before broad structural topics;
   explicit traversal-family combinations are handled without guessing a DP
   subtype or BFS/DFS from a broad tag alone.
4. Reviewed problem-identity refinements are used only where the provider
   vocabulary lacks a usable distinction, especially intervals and DP
   subpatterns. They refine the classifier; they are not a list of every
   problem's tags.
5. A saved manual placement override wins. Otherwise the first clear candidate
   is primary. No clear evidence becomes **Other / needs classification**.
6. On recording practice, the chosen topics are classified into one effective
   practice unit. The stored raw selected topics are preserved for audit and
   future classifier changes.

Provider-topic changes on reimport can update inferred placement/candidates.
They do not rewrite historical practice events, notes, assistance, recorded
dates, manual placement, or the learner's selected topics. See
[classification rules](import-classification.md) and
[reviewed evidence](pattern-classification-evidence.md).

## Goal and attention model

The learner chooses **Interview Focused** or **Deep Understanding**, plus a
300/500/1000 problem target. `goal-policy.js` allocates that target over
categories, subpatterns, and difficulty buckets. It uses explicit policy
weights informed by the cited curriculum/interview material; the exact target
matrix is Recall's policy, not an externally published universal quota.

The API returns:

- actual and credited goal coverage by category/subpattern/difficulty;
- an experience/practice-strength summary per category and subpattern;
- focus emphasis derived from the selected profile and each target's share;
- the dynamic priority score and whether its downward movement is held by a
  coverage or practice gate.

These fields are deliberately separate. A high interview focus badge is not a
claim that a learner is weak; high practice strength does not erase interview
relevance. The order combines the two only for the action queue.

## Practice-strength model (current implementation)

The model is transparent and adjustable, but **not calibrated as an individual
memory probability**. The implementation details and exact UI bar are in
[retention policy](retention.md); the conceptual summary is:

- Breadth rises with distinct problems against a subpattern-specific target.
- Reinforcement rises with revisits, weighted by the recorded assistance:
  independent work contributes most, a hint contributes partially, and a
  solution-assisted attempt contributes less. Imported unknown assistance does
  not become a revisit credit.
- Recency rises from dated observed practice and decays with time, except for
  a temporary hold earned by completed practice blocks.
- The experience baseline persists; the recency-derived part changes while the
  learner is away.
- A practice block requires four different problem identities and four
  weighted evidence credits in one unit. A one-problem streak cannot finish it.
- A completed block holds recency for three days; blocks spaced on later local
  days extend the hold by two days each, up to fourteen.
- Current visible evidence can grow on partial work; queue weakness is
  committed only through the last complete block (plus historical solves).

Unknown-dated imports are not counted as dated recency. Category overview
summaries aggregate their members; the dashboard's top-level bar averages only
patterns with dated assessments and reports undated experience separately.

## Why there is derived queue state

Current evidence can improve gradually, but the user specifically wanted a
meaningful amount of work before a pattern moves down the ranked list. The API
stores a queue anchor and evidence baseline in `workspace_goal.queue_snapshot`.
The user's bar can show gradual progress while ordering stays stable. A
coverage release occurs after a four-credit coverage block (or goal completion);
a new weighted practice block is a separate release path. Corrections can
replay the snapshot so removed/changed evidence does not leave an invalid rank.
Patterns are still compared with each other, so a different pattern may rise
above a held one. Crossing a gate permits reassessment; it does not promise a
specific position.

`Other` is available for classification, but excluded from scored goal and
attention ranking until its problems are assigned to a real DSA pattern.

