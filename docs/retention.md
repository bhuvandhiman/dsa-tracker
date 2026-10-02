# Pattern progress, focus emphasis, and practice strength

All learning scores are product heuristics, not measured recall probabilities. Research and its limitations are in retention-research.md. Defaults live in retention-policy.js, practice-policy.js, and goal-policy.js.

## Three separate signals

Bar length shows progress within its own pattern: 65% of actual difficulty-balanced goal coverage plus 35% of current practice strength, bounded to 0–100. There is no shared maximum-target denominator. Without a configured goal, it shows practice strength alone. Unknown practice dates contribute an experience baseline while retention remains unassessed. Other has no scored progress bar. Public attention-point labels and hover explanations are removed.

Bar color and a visible badge show focus emphasis: coral/high, mustard/medium, teal/lower. Category importance is its selected profile weight divided by that profile's largest category weight. Subpattern importance multiplies that ratio by its target divided by its parent's largest subpattern target. Ratios at least 0.5 are high, at least 0.25 medium, otherwise lower. These thresholds and profile weights are preparation policy, not empirical interview probabilities. Manual learning data never changes a pattern's importance color. Changing the profile can change it.

Queue position combines actual coverage need and committed practice need, weighted by profile-specific targets. Raw attention = 0.65 * actual remaining goal credits + 0.35 * pattern target * committed practice weakness. Every accepted coverage credit is counted immediately; no per-subpattern rounding hides progress. Practice strength itself does not change when switching profiles.

## Practice strength and holds

Breadth B = 1 - exp(-distinctProblems / patternBreadthTarget). Reinforcement D = 1 - exp(-weightedRevisits / 10). Independent revisits contribute 1, hints 0.5, solution-assisted 0.2, imported unknown 0. Separate local practice days are required for revisits.

Experience E = 100 * (0.5B + 0.3D) / 0.8. Dated strength = E + (100-E) * 0.2R. Practice adds (1-R) times 0.6 independent, 0.4 hint, 0.2 solution, or 0.3 imported unknown. Only recency R decays, with a default thirty-day half-life outside holds; breadth and reinforcement persist. Assistance is not inferred from an accepted submission. Imported unknown assistance cannot earn blocks.

A block requires at least four distinct problems in one subpattern and four weighted credits: independent 1, hints 0.5, solution 0.2, unknown 0. Each pending identity contributes its strongest evidence once. Repeating one problem cannot complete a block. Later blocks can revisit the same set on later days.

The first block earns a three-day recency hold. Each later block completed on a different local date from the preceding block extends the duration by two days, capped at fourteen. Same-day blocks do not extend the duration. Partial work can grow the bar without extending the earned hold. After the hold, gradual decay resumes. These are adjustable defaults, not established DSA memory intervals. Asia/Calcutta defines local days.

## Stable downward movement

Committed practice weakness still uses evidence through the last completed weighted practice block, plus legacy solved identities. Visible progress uses all current evidence.

Migration 011 adds derived queue_snapshot memory to workspace_goal. Categories and subpatterns have separate namespaced anchors. A falling attention score cannot lower its ranking anchor until four additional difficulty-balanced coverage credits accumulate, a new weighted practice block completes, or the remaining coverage target is completed. Increasing need can raise the anchor immediately. Two-point bands use catalog order for ties. Partial progress remains visible throughout.

The snapshot stores baseline credits, block count, remaining gap, and ranking anchor. Profile, target, or policy-version changes reset it. Credits or completed-block counts falling below their saved baseline replay the ranking after corrections. Optimistic updates prevent a concurrent refresh or goal edit from overwriting newer queue memory. Repository/process restarts reuse the persisted snapshot. It travels with workspace_goal in same-schema backups.

Original practice, notes, tags, assistance, dates, placements and selected goal settings are preserved. Recorded approaches determine practice evidence; primary classification determines coverage. Corrections recalculate the relevant signals. No scheduler, daily check-in, revision countdown, or fabricated practice date is required.


## Split priority presentation

The latest presentation replaces the single progress fill with two equal halves. Coral is the selected-focus coverage push (`gap / largest target at this level`); mustard is the target-weighted retention push (`target * committed practice need / largest target at this level`). Category rows share the maximum category target; subpatterns share the maximum sibling target. Multiplying the two percentages by their shared scale and the existing 65/35 ranking weights reconstructs the current raw attention score. Equal visual space does not change these weights. Larger fills indicate need, not mastery or recall probability. Unknown dates are labelled undated and hatched.

The small dashed-end coverage threshold shows credits earned since the current queue anchor against the four-credit release requirement. Completed practice blocks and goal completion are separate release routes. Crossing a threshold permits recalculation; it cannot guarantee a rank change against other patterns. Persisted queue anchors still apply, and practice records, classification, goal quotas and ordering weights are unchanged.


Presentation correction: the user rejected separate half-tracks. Current UI stacks adjacent coral and mustard segments in one continuous track, with widths equal to 65% of focusPush and 35% of retentionPush. Total fill is exactly raw attention / shared scale. The internal dashed mark projects the remaining credits to the next four-credit coverage release (or coverage completion), holding retention constant. It is not a guaranteed rank boundary; practice-block release and recency changes remain independent. The separate threshold mini-track was removed.


## Threshold audit (v8)

A coverage gate is based on credited goal coverage since the last derived baseline. Its requirement is the smaller of four credits and the remaining baseline gap; complete goals have no coverage gate or dashed marker. Bulk gains retain the remainder after each group of four. Every credited solve changes the coral segment immediately, but the pattern's own committed rank score cannot fall before coverage completion or a full coverage/revision block. Other patterns can still rise past it.

Revision progress comes directly from pending weighted distinct problems in one subpattern. Independent=1, hint=0.5, solution=0.2 and unknown=0. Four weighted credits and at least four distinct problems are required. Category progress displays the most advanced individual subpattern; siblings never pool their pending credits. Revision blocks can release ranking even when no new coverage is earned. Same-problem/same-day duplicates and future or missing dates cannot advance a gate. On completion the counter starts the next block, labelled Next revision/Next coverage.

The API owns the marker and counters; the browser no longer duplicates threshold arithmetic. The dashed marker projects the next coverage release, holding retention constant, and never pretends to predict a revision score or guarantee a new rank. Actual revision progress is shown alongside coverage. No phantom 0/4 coverage marker remains after completion.

Committed evidence has a fingerprint so corrections to dates/assistance replay ranking even when the number of completed blocks stays the same. Removed/restored blocks replay their hold and gate. Derived memory also tracks the last observed credit count to detect partial-credit corrections, ignores malformed numeric baselines, and clears on actual goal-profile/target changes (including switching away and back before a refresh). Saving identical goal settings preserves the gate. The policy version is v8; old derived anchors are rebuilt once, while recorded evidence and selected settings remain unchanged.

Unknown-assistance historical imports are excluded from the committed evidence fingerprint so a newly imported backdated date cannot masquerade as a correction and bypass the meaningful-practice gate. Such dates can inform displayed recency, but cannot earn revision credits or unlock a held rank.


## Growing capability presentation

The current continuous bar shows strength rather than urgency. Pink occupies 65% of the pattern's own goal coverage; yellow occupies 35% of its current dated practice strength. Partial practice updates yellow immediately, while the committed queue evidence still waits for a meaningful block. Foundation remains built as recency fades. Without dated evidence, retention is null/unassessed and contributes no colored fill; previous solves still fill foundation. Without a selected goal, existing normalized breadth supplies foundation. These are policy estimates, not measured recall.

Focus importance is a separate badge beside each pattern/subpattern name. It continues to influence ranking; it no longer makes a weak, rare pattern look full. Consequently fills need not be strictly increasing down a focus-weighted queue. The API's growing coverage marker is current combined fill plus the pink contribution of the remaining coverage-block credits, using the pattern's own target and holding current retention constant. It lies ahead of the fill and disappears when coverage is complete. Revision progress remains a separate truthful counter, not a fabricated future retention score. The gate policy, anchors, holds, goal settings and practice history are unchanged by this presentation change.

## Coherent strength display (2026-10-02)

The current UI supersedes the 65/35 goal-coverage capability blend. One continuous bar now represents the existing practice-strength estimate, not measured recall. Pink is `experienceScore`, based on solve breadth and reinforcement. Yellow is `strength - experienceScore`, the additional recent-practice contribution. `strengthComponents` exposes both from the API; the frontend can also use the existing `experienceScore` on older API snapshots. The segments sum exactly to `strength`; only the displayed percentage is rounded. Changing goal size/profile or focus badges never changes the fill for unchanged practice evidence.

Without valid practice dates, the experience baseline can still be visible, but the strength percentage is unassessed and yellow is zero. A single dated solve may add a small recent-practice contribution to a substantial imported baseline; it is never presented as demonstrating recall of every imported problem. The underlying product-default strength formula and queue policy v8 are unchanged.

Four practice-block dots display weighted distinct evidence for the API's most-progressed subpattern. Fractional work fills part of a dot. New solves and revisits can both qualify, so the label is Practice block rather than Revision. Repeated attempts at one identity do not fill the block. Completion resets pending dots and the completed-block total remains visible. The projected coverage marker and both Next counters are removed. Coverage-based queue releases still operate and are explained in the shared disclosure, alongside practice-block releases and the fact that reassessment does not guarantee a lower rank.

Primary solves count problems once by assigned placement. Distinct practice problems follow recorded approaches and can differ; dated and dates-unknown counts partition that evidence and do not count sessions. Difficulty bars are explicitly Goal coverage, capped by subpattern and difficulty. Extra solves still count as experience. Short recommendation reasons use the actual coverage/practice contributions or an active held gate; they do not imply that strength determines exact rank.

Difficulty count display update (2026-10-02): goal coverage now displays actual primary solves / difficulty target, including over-target totals such as 20/16. Track fill and percent still use capped credited/target, preserving subpattern balance. A category can therefore show over-target raw totals without a full bar when another subpattern has a gap. Segmented summaries and tooltips use the same semantics. This is presentation only; strength, queue order, goal credit allocation and thresholds are unchanged.
