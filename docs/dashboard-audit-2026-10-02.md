# Dashboard, patterns and queue audit — 2 October 2026

The audit preserves the approved strength presentation and queue policy v8. Confirmed consistency and interaction defects were fixed. It does not recalibrate the product's scoring weights or add a new phase.

## Fixed findings

| Finding | Effect | Fix and evidence |
| --- | --- | --- |
| Dashboard queries read different database states | An import committed between reads could show zero primary solves alongside one goal solve in the same response. | Read classification, attempts, historical/imported solves and the goal in one repeatable-read transaction. Persist derived queue memory afterward using the existing optimistic comparison. An isolated PostgreSQL test commits an import between reads; it failed before the fix and passes afterward. The next refresh sees the new solve consistently. |
| Zero-target difficulty solves disappeared from summaries | Detail totals excluded a subpattern's extra solves when its difficulty target was zero. | Sum actual counts before filtering out zero-width segments. Credit and fill remain capped. Regression failed before the fix. DP detail now agrees with its category: Hard 9/11, including the zero-target extras. |
| Old-response fallback omitted unknown difficulty | A primary solve total could exclude unknown-difficulty problems when using the older numeric goal.actual response. | Include unknownDifficulty in that fallback; authoritative coverageSolved still takes precedence. Regression added. |
| Pattern edits left parent statistics stale | The problem list refreshed while parent counts, coverage and queue position waited for the 45-second poll. | Notify the parent dashboard immediately after a successful edit, while refreshing the scoped list. Frozen recorded approaches remain unchanged. |
| Removing the last item from a paginated view left an empty page | A moved problem could reduce the total below the current offset. | Clamp to the last existing page and refetch. Tests cover exact page boundaries, partial pages and empty inventories. |
| Imported undated solves looked unpracticed | A null date rendered “Not yet” even for historical solves. | Show “Dates unknown” for historical or recorded problems without dates; reserve “Not yet” for unpracticed problems. Unit and browser checks. |
| Search state and URL diverged | A filter survived navigation to an unfiltered route, or disappeared when returning from detail. | Put search in the URL without adding a history entry per keystroke; remount the dashboard on route identity changes. Browser Back restores knapsack, the Patterns navigation clears it, and detail/back links preserve it. |
| Manual placement fetched the entire retention dashboard | Opening the picker recalculated scores and attempted a queue-memory write to obtain a static catalog. | Dedicated /api/patterns/placements catalog route, generated from the same classification/validation catalog. Route test ensures completeness without retention calls. Browser editor offers all 39 units plus its placeholder. |
| Edit copy confused primary placement with practiced approach | Users could expect a coverage edit to rewrite earlier practice evidence. | Label the field “Primary pattern” and explain that recorded practice stays with its original approach. |
| Dead frontend scoring and styling remained | Old mixed coverage/strength helpers and urgency styles could be reused accidentally. | Removed unused frontend patternProgress/evidenceLabel helpers and confirmed unused live-metrics, detail-overview, practice-gap-bar and subpattern-chevron CSS. Public API compatibility projections remain intact. |
| Proxy outages exposed JSON parser errors | A non-JSON upstream failure yielded a technical parsing message. | Preserve structured API errors and cancellation; give useful messages for unavailable or unreadable API responses. Browser outage retains the last successful snapshot and recovery action. |

## Ranking and threshold checks

- Selected focus changes the goal matrix and emphasis. Interview and Deep Understanding are product presets; they are not measured company interview frequencies.
- Attention combines 65% balanced coverage deficit and 35% target-weighted committed practice need. Strength fill is an independent estimate. Fuller strength bars therefore need not appear last in the queue.
- Priority uses stable two-point bands and catalog tie-breaking. Unclassified problems remain last and are not given a fabricated strength score.
- A partial practice block grows current strength but does not immediately lower committed practice priority. Coverage reductions also wait for their credit gate. Completion permits reassessment; it does not guarantee a rank drop.
- A practice block needs four weighted credits from at least four distinct problems in one subpattern. Independent work earns 1, hints 0.5, solutions 0.2, unknown assistance 0. Repeating one problem and pooling siblings do not complete the block.
- Coverage gates retain bulk-import remainders and release near completion for the remaining gap. Corrections, removals, restorations and goal changes replay queue memory rather than keeping stale improvement.
- Completed practice grants the existing 3-day hold, with spaced blocks extending it by two days up to 14. Current recency fades afterward; experience is not erased by time alone.
- Goal fills remain capped within each subpattern and difficulty. Extra raw counts neither fill another gap nor add goal credit. Existing breadth/repeat-work scoring remains unchanged.
- Same-day attempts and imported submissions are deduplicated according to the existing policy. Missing/future dates do not fabricate dated retention; imported unknown assistance cannot complete a practice block.

The initial audited live Interview 500 snapshot has 389 known-difficulty primary solves and 274 goal credits. All 17 categories and 39 subpatterns reconcile parent/child primary counts, known/unknown totals, difficulty targets/credits and additive strength segments. Arrays & hashing, Dynamic programming and Graphs remain the first three. The later live Deep Understanding 1000 snapshot shows Graphs, Dynamic programming and Trees leading, with 296 goal credits and the same 48% average strength. The focus/goal change was observed during the audit; no real-workspace goal was set by the audit. No ranking defect requiring a scoring-policy change was found in these checks.

## Classification and trust

Provider topics, primary classification and recorded practice approaches serve different purposes. LeetCode's tag totals overlap; Recall's primary coverage counts each solved problem once. A manual primary-placement change should move coverage, while a previously recorded approach stays with the attempt. The integration suite verifies that separation, import deduplication and corrections.

Specialized topic mappings take precedence over broad tags. Ambiguous BFS/DFS or underspecified DP tags must stay general rather than guessing an exact technique. The catalog and limited curated refinements are explicit policy, not accidental rigidity. SQL/Pandas-only records are outside DSA tracking and do not belong in DSA goal totals. This audit did not compare the live account to a newly fetched LeetCode tag inventory or claim every ambiguous problem has an exact inferred subpattern.

## Verification

- ESLint, 195 unit tests and production build pass.
- 10 PostgreSQL integration tests pass using isolated temporary schemas, including the new concurrent-import regression.
- Existing test coverage exercises all six focus/goal combinations, threshold boundaries, hold/decay, assistance weights, duplicates, corrections, recovery, import retries, account separation and backup round trips.
- Browser: dashboard, list, category detail, search/Back navigation, whole-row expansion/collapse, three-state difficulty sorting, editor open/cancel/manual choices, imported date labels, mobile/tablet layouts and dark mode.
- At 320px, 390px and 768px viewport widths, tested pages and the mobile editor have no horizontal document overflow. The final desktop proof is saved separately.
- Simulated outage only on the audit-owned API process; last snapshot and actionable recovery verified, then the API restarted.
- Real user problems, recordings, placements, goal and imports were not edited to create test cases. API reads may persist the existing derived queue snapshot as usual. Browser placement saves were inspected in source and database placement behavior tested; no real-account relocation was used as a UI test.
- Scope is source review, automated checks and representative browser interactions, not an exhaustive external LeetCode integration or production load test.

## Improvements worth discussing before the next phase

1. **Make balanced credit more immediately visible.** The requested raw labels are correct, but 9/11 alongside 36% fill still asks the user to understand subpattern balance. A short always-visible “4 credited” indicator could explain it without a paragraph or tooltip. Keep actual solves visible.
2. **Keep the main bar's assessment scope prominent.** It averages only patterns with dated practice. The existing “12/16 patterns with dated practice” line should remain visible; an attractive score must not imply all patterns were assessed.
3. **Centralize configuration copy later.** Goal choices and the explanatory block weights are still duplicated between server policy and frontend copy. Expose one policy/options contract before changing those settings so the explanation cannot drift.
4. **Judge weights against user outcomes.** Keep current stable presets until there is evidence to recalibrate them. They prioritize practice; they are not a validated recall measurement or a measured interview-frequency model.

No new page, history flow, scoring phase or additional configuration was added.
