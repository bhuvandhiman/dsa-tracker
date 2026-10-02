# Practice strength and readiness

Scores are product heuristics, not measured recall probabilities. Research and limitations are documented in retention-research.md. Numeric defaults live in retention-policy.js, practice-policy.js, and goal-policy.js.

## Visible progress

Breadth B = 1 - exp(-distinctProblems / patternBreadthTarget). Reinforcement D = 1 - exp(-weightedRevisits / 10). Independent revisits contribute 1, hints 0.5, solution-assisted 0.2, and imported unknown assistance 0. Each identity contributes breadth once; reinforcement requires separate practice days.

Experience E = 100 * (0.5B + 0.3D) / 0.8. Dated strength = E + (100 - E) * 0.2R, bounded to 0–100. Practice adds (1-R) times 0.6 for independent work, 0.4 for hints, 0.2 for solutions, or 0.3 for imported unknown assistance. Only recency R decays, with a default 30-day half-life outside earned holds. Breadth and reinforcement persist. Strong sustained practice can exceed the former artificial 94% cap.

Without dates, the experience baseline remains visible but retention is unassessed. Imported solves never acquire invented practice dates or assistance labels.

With a configured goal, the main pattern bar is Practice priority, using the same two-point bands that rank the queue. Higher fill means more attention needed. The label shows buffered attention points, not a percentage. Categories share a scale equal to the largest category target; subpatterns share the largest target within their parent. These fixed goal scales avoid changing every bar when a neighbor is practiced. Hover or focus exposes raw coverage and practice contributions, profile, actual/committed gaps, and band rounding. Without a goal, bars show committed practice weakness on a 100-point scale. Other remains unscored. Practice strength and difficulty completion remain separate.

## Meaningful blocks and holds

A block requires at least four distinct problems within one practiced subpattern and four evidence credits: independent = 1, hint = 0.5, solution = 0.2, unknown = 0. The strongest assistance evidence for each problem counts once within a pending block. Repeating one problem cannot complete a block. Partial work carries forward and clears when its block completes. Subsequent blocks may revisit the same set on later days.

The first completed block holds recency steady for three days. Each later block completed on a different local date from that subpattern's preceding block extends its hold by two days, capped at fourteen. Multiple same-day blocks do not extend the duration. After the hold, gradual decay resumes. Partial blocks improve the visible score without extending the earned hold. These are adjustable product defaults, not scientifically established DSA intervals.

Daily grouping uses Asia/Calcutta. Explicit evidence wins over imported unknown; otherwise the strongest assistance and latest time win within a problem/day. Child summaries are separate. Category summaries aggregate distinct identities while checking blocks separately by practiced subpattern, preventing unrelated partial practice from earning a combined hold.

## Stable attention queue

Queue practice weakness uses evidence committed through its last completed practice block, plus legacy solved identities. Later partial practice grows the visible bar immediately but does not refresh queue evidence. Committed evidence still decays after its earned hold.

Coverage affects queue attention in four-credit increments within each subpattern; completing a target releases any final smaller remainder. Actual coverage and difficulty bars always update immediately. Coverage counts accepted identities regardless of assistance; dated practice blocks apply separate assistance weighting.

Attention = 0.65 * committed remaining goal credits + 0.35 * profile target * committed practice weakness. Two-credit score bands use catalog order for ties. This reduces small reorders through deterministic bucketing, not persisted hysteresis. Profile-specific targets preserve interview/deep-understanding emphasis. Without a goal, ranking uses committed practice weakness in two-point bands. Other stays last.

## Evidence and correction

Attempts retain their stored practice_unit and approach_source independently of browsing placement. Placement corrections move coverage and legacy classification without rewriting recorded approaches. Editing or deleting practice recalculates blocks, holds, readiness, and ranking from remaining evidence. Imported evidence overlapping a recorded problem/day or submission is suppressed while the recording exists.

No scheduler, daily check-in, countdown, or schema migration is required. Scores are calculated at request time and refreshed by the dashboard. Original attempts, notes, tags, and settings are preserved.
