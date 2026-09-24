# Practice strength

Practice strength is a product heuristic for experience and recency, not a measurement of memory or mastery. Constants live in apps/api/src/retention-policy.js.

## Calculation

- Breadth B = 1 - exp(-distinctProblems / 20), weight 0.5. Legacy problems count once within their primary subpattern; dated attempts count under their stored practiced approach.
- Reinforcement D = 1 - exp(-weightedRevisits / 10), weight 0.3. A revisit requires an earlier dated practice day for the same problem and subpattern. Independent revisits add 1, hints 0.5, solution-assisted 0.2, imported unknown 0.
- Recency R decays with a 30-day half-life. Each practice adds (1-R) times 0.6 independent, 0.4 hints, 0.2 solution-assisted, or 0.3 imported unknown.
- Strength = min(94, 95 * (0.5B + 0.3D + 0.2R)). Only R decays. Nothing another subpattern does changes this bar.

Daily grouping uses Asia/Calcutta. Within a problem/subpattern/day, explicit evidence wins over imported unknown; otherwise use the strongest assistance, then latest time. All attempts remain in history. Imported evidence matching a recorded problem/day or submission identity is suppressed while that recording exists, so uncertain imported approaches do not refresh extra patterns.

Without dated evidence, the visible bar uses the experience-only score 95 * (0.5B + 0.3D) / 0.8 and is labeled “Prior solves · date unknown.” The assessed flag remains false and recency remains null, so the API does not invent practice dates. Every subpattern, including untouched ones, has a bar.

Breadth uses a centralized target per subpattern. Broad patterns such as hashing need more distinct problems; narrow or advanced patterns such as segment trees and minimum spanning trees need fewer. This makes the coverage component comparable without treating raw problem counts as equivalent across patterns.

Experienced subpatterns sort weakest first. Each major row uses its weakest experienced child; untouched children and wholly untouched categories follow. Needs classification is outside ranking. Ties use catalog order.

## Evidence and correction

Attempts store one practice_unit and approach_source (confirmed or inferred), independently of browsing placement and raw topic tags. Migration 006 uses an unambiguous specific recorded approach when possible; otherwise it snapshots the primary classification as inferred. New captures prefill an approach that the user can correct or confirm.

Changing browsing placement affects legacy/imported classification but cannot rewrite stored attempts. Correcting an attempt changes its own approach and recalculates the bars. Removing an attempt may reveal independently imported dated evidence again. History, notes, assistance and original tags are preserved.

No scheduler or persisted countdown is needed: the API calculates strength from evidence at request time. The dashboard refreshes periodically and after corrections.
