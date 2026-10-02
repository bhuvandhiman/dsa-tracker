# Threshold audit — 2026-10-02

The audit traces recorded events through retention blocks, capped goal credits, persisted queue anchors, API signal metadata, and continuous-bar rendering. The accepted rule is that partial practice is visible while a pattern's own ranking score waits for meaningful work before falling. A completed block permits recomputation; it cannot guarantee a new position relative to other patterns.

## Defects corrected

- Revision practice on already-solved problems had no displayed threshold progress. Pending weighted distinct evidence is now exposed independently of new coverage.
- Near-complete goals always displayed a four-credit requirement; fully complete goals retained a phantom marker. Requirements now use the actual remaining baseline gap and disappear after coverage completion.
- A bulk gain of seven credits reset the baseline at seven, losing the next block's three-credit remainder. It now commits four and carries three.
- The browser separately projected its own threshold. The API now supplies the marker from the exact queue gate; the client only renders it.
- Corrections could retain stale ranking when block count stayed constant. Committed explicit evidence fingerprints detect date/assistance changes; credit corrections, removals and restorations also replay the derived baseline.
- Switching away from a focus and back before refreshing could reuse stale memory. Actual profile/target changes clear it; saving identical settings preserves it.
- An additional regression caught an unknown-assistance backdated import masquerading as a correction. Such evidence is excluded from the explicit-practice fingerprint and cannot bypass a held queue score.
- Malformed derived numeric memory could produce NaN or frozen rankings. Invalid baselines are ignored and rebuilt.
- Missing/null event dates could be interpreted as 1970 practice. They are excluded.
- The 320px body minimum caused horizontal overflow when a scrollbar reduced the usable width. The layout now fits the available width.

## Verified behavior

Coverage credits update the coral segment immediately. One, two or three credits preserve the held score through repeated refreshes; the fourth releases it, and overflow carries forward. At a goal with only two credits remaining, the threshold is two rather than four. Completion hides the coverage marker while revision stays available.

Revision requires four weighted credits and at least four distinct problems in one subpattern. Independent solves count 1, hints 0.5, solutions 0.2 and unknown assistance 0. Repeats of one identity do not finish a block; same-day retries do not duplicate evidence. Pending credits from siblings are never pooled. The category displays the most advanced individual subpattern, named when it has progress. A completed revision block releases ranking without requiring new coverage. Counters roll to the next block, explicitly labelled Next coverage and Next revision.

The dashed line is a coverage-release projection holding retention constant. It does not estimate a future revision score or predict a guaranteed rank change. Revision progress appears alongside it. Holds and post-hold recency decay retain their existing policy; decay cannot mint threshold credits.

## Verification

- 182 unit tests, lint and production build pass.
- 13 focused threshold cases cover partial/bulk credits, near completion, revision without coverage, assistance weighting, sibling/repeat isolation, same-count corrections, invalid memory, stable markers, policy changes, missing/future dates, decay, remove/restore and unknown-import bypass.
- A quota sweep exercises every size from 1 through 60 and every sequential credit within each quota, verifying bounded counters/markers and guarded score reductions.
- All 9 PostgreSQL integration cases pass. The added threshold scenario verifies real repository imports, retries, recreation, backup/restore, parallel refreshes, dated revision, correction, removal/recovery and focus switches in disposable schemas.
- Browser QA confirms category and subpattern counters and 320px layout; document clientWidth and scrollWidth are both 305px with the scrollbar present.

The API must restart to load policy v8. Old derived queue anchors rebuild once on upgrade; historical practice, notes, classification and selected goals are preserved. Temporary verification servers are stopped after QA. No signed-in LeetCode actions were needed for this policy audit.

Presentation follow-up: the latest user-approved bar grows with foundation and current dated retention. Its dashed marker now projects additional foundation toward the same audited coverage gate; it sits ahead of the fill. The old urgency projection remains in the API for compatibility, but current UI uses capabilitySignals.coverageMark. Gate behavior and audit regressions remain unchanged.
