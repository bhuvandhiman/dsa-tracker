# Retention research: what Recall should measure and recommend

Research date: 2 October 2026. Prepared for the DSA Tracker / Recall project.

This is a research and design report, not an implementation of a new scoring algorithm. Research findings, extrapolations to DSA, and proposed product defaults are identified separately. This is a targeted literature review, not an exhaustive systematic review.

## 1. The main conclusion

Recall should reward demonstrated independent recall across spaced sessions, while separately showing how much of a pattern the learner has explored. Interview importance belongs in the recommendation queue. A retention percentage needs a defined assessment task and evidence of both success and failure; a solve count alone cannot supply that evidence.

Three questions need distinct answers:

| Question | Appropriate measure | What it cannot establish |
|---|---|---|
| How much have I practiced? | Distinct problems and coverage against the chosen goal | Whether I can recall an approach today |
| Can I reproduce or apply this learning now? | Delayed independent assessment; eventually a calibrated prediction | Permanent mastery or success on every unseen problem |
| What should I practice next? | Revision need, goal gaps, interview relevance, available time | A percentage of knowledge retained |

These can live together in one dashboard. They should not be collapsed into one number with changing meanings. Queue order and the readiness bar need not have identical ordering when importance also affects the queue.

## 2. What the research actually establishes

### Retrieval improves delayed retention

Roediger and Karpicke (2006) compared studying passages again with recalling them from memory. Restudy helped more on the immediate test, but retrieval helped more after two days and one week. Repeated studying also increased confidence. Feeling fluent immediately after reading is therefore a weak substitute for delayed performance. This experiment used prose, not coding. [Publisher abstract](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/)

Karpicke and Roediger (2008) found that repeatedly retrieving already-learned vocabulary benefited delayed recall, whereas additional study after successful learning did not produce the same benefit. First success was not the end of useful practice. [Original paper/publisher abstract](https://doi.org/10.1126/science.1152408)

Yang and colleagues (2021) synthesized 222 independent classroom studies involving 48,478 students. The overall benefit of quizzing was a medium standardized effect, g = 0.499. That is an effect-size estimate, not a 49.9% improvement for an individual. [Paper abstract](https://pubmed.ncbi.nlm.nih.gov/33683913/)

Agarwal, Nunes and Blunt (2021) reviewed 50 classroom experiments involving 5,374 students; 57% of the 49 calculable effects were medium or large. Results were generally positive across settings, but most samples came from Western, educated, industrialized, rich and democratic populations. It is strong applied evidence for retrieval, with limits to generalization. [Author-hosted full paper](https://pdf.poojaagarwal.com/Agarwal_etal_2021_EDPR.pdf)

**DSA interpretation:** beginning a revision by reconstructing the idea, invariant and implementation without help is more informative than rereading a familiar editorial. The exact benefit for interview-style DSA needs validation in our users.

### Spacing matters, but there is no universal revision calendar

Cepeda and colleagues (2008) studied factual learning with 1,354 participants and retention intervals extending to roughly a year. Increasing the gap between learning sessions first improved and then reduced later recall. The best gap increased with the desired retention horizon. Interpolated recall optima were approximately 3, 8, 12 and 27 days for retention intervals of 7, 35, 70 and 350 days. These were conditions in a two-learning-session experiment, not instructions to repeat every coding problem on those days. [Full paper, especially Results and Discussion](https://labs.biology.ucsd.edu/rifkin/courses/bieb100/f14/Cepeda_et_al_2008_Psychological_Science_Spacing_Effects_in_Learning_A_Temporal_Ridgeline_of_Optimal_Retention.pdf)

Rawson and Dunlosky's 2022 review describes successive relearning: retrieve to an adequate criterion, then return in later sessions and relearn to criterion again. It reports vocabulary findings in which one correct recall in each of three spaced sessions produced 68% one-week retention versus 26% for three correct recalls in one session. The authors explicitly caution that one fixed prescription, such as three sessions being enough, will not generalize to every context. [Full review](https://journals.sagepub.com/doi/pdf/10.1177/09637214221100484?download=true)

**DSA interpretation:** independent success after a delay is stronger evidence of durable learning than several immediate rewrites of the same solution. Review timing should adapt to outcome and the learner's deadline rather than impose one schedule forever.

### Feedback and examples are part of learning

Pashler and colleagues (2005) studied word-pair learning. Providing the correct answer after an incorrect response improved later performance; merely reporting right or wrong was not equivalent. A useful correction teaches the missing information. This does not establish an exact penalty or bonus for solution-assisted coding. [Full paper](https://www.yorku.ca/ncepeda/publications/PCWR2005.pdf)

Margulieux, Morrison and Decker (2020) studied subgoal-oriented instruction in introductory programming with 265 students. Labeled worked examples improved early quizzes and reduced failure/withdrawal, but did not significantly improve average exam performance. It is direct programming evidence that structured examples can help novices; it does not prove long-term mastery of advanced DSA. [Open-access paper](https://link.springer.com/article/10.1186/s40594-020-00222-7)

**DSA interpretation:** looking at a solution is a legitimate learning activity. It should start a relearning step, rather than either pretending independent mastery or erasing all prior progress. Explain why each step works, then later reconstruct it without the example.

### Mixed practice helps some kinds of discrimination

Rohrer, Dedrick and Stershic (2015) compared blocked and interleaved mathematics practice. At a 30-day delayed test, average scores were 74% versus 42% in favor of interleaving. These are specific classroom results, not a guaranteed coding gain. [Full paper](https://files.eric.ed.gov/fulltext/ED557355.pdf)

Brunmair and Richter (2019) synthesized 59 studies and 238 effects. Overall interleaving benefited learning, but effects differed by material: mathematical tasks had a smaller effect, and word-learning tasks favored blocking. Interleaving is not automatically superior for every stage or subject. [Published abstract](https://pubmed.ncbi.nlm.nih.gov/31556629/), [author manuscript](https://www.psychologie.uni-wuerzburg.de/fileadmin/06020400/2019/Brunmair_Richter_in_press__2019_META-ANALYSIS_OF_INTERLEAVED_LEARNING.pdf)

**DSA interpretation:** after initially learning a technique, mix confusable approaches and hide labels during assessment. Choosing between sliding window and prefix sums tests something that a list headed “Sliding Window” gives away. The initial introduction to a new technique may still benefit from focused examples.

### Remembering an old answer does not guarantee transfer

Pan and Rickard (2018) synthesized 122 experiments with 10,382 participants. Retrieval produced an average transfer effect of d = 0.40, but transfer varied substantially with the task and training conditions. Their findings do not justify treating a remembered solution as proof of broad pattern mastery. [Full meta-analysis](https://pdf.retrievalpractice.org/transfer/Pan_Rickard_2018.pdf)

**DSA interpretation:** maintain two evidence types: reproducing a practiced problem and applying a pattern to an unfamiliar variant. A learner might be strong at the first and weak at the second. A new independent variant is useful evidence of transfer; it does not automatically refresh every technique appearing in its provider tags.

### A forgetting curve is not a universal percentage-loss rule

Murre and Dros (2015) replicated the historical Ebbinghaus procedure with one participant learning nonsense syllables. The study measured savings in relearning effort, which differs from independent recall accuracy. Its familiar curve should not be read as a universal claim that everyone forgets a fixed percentage of algorithmic knowledge after a day. [Open-access paper](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0120644)

**DSA interpretation:** we have no basis for assigning every person and every subpattern the same 30-day half-life. Nor does failure to recall once mean all previous learning has vanished.

### Adaptive models are useful, but predictions require validation

Settles and Meeder (2016) proposed trainable half-life regression for language learning. It estimates recall from elapsed time and a learned half-life, rather than a universal decay constant. Its vocabulary results are not a validated DSA scheduler. [Full ACL paper](https://aclanthology.org/P16-1174.pdf)

Eglington and Pavlik (2020) combined simulations with an experiment using Japanese–English vocabulary. Their higher-probability scheduling thresholds, 0.86 and 0.94, outperformed tested alternatives. Thresholds depended on task and time costs; making practice maximally difficult was not always most efficient. We cannot transplant 94% as a universal coding optimum. [Full paper](https://files.eric.ed.gov/fulltext/ED608719.pdf)

Choffin and colleagues (2019) proposed DAS3H for educational tasks involving multiple skills. Skill-specific temporal features improved predictions in their datasets. The study evaluates predictive modeling, not a randomized DSA scheduling intervention. It is relevant to pattern/subpattern histories, while leaving real scheduling benefits to be tested. [Full research paper](https://arxiv.org/html/1905.06873)

Anki's official documentation describes an operational example: a default desired retention of 90%, adaptive parameters fitted to review history, and a sharply rising review burden as the requested rate approaches 100%. Those are flashcard scheduling conventions, not proof of an optimal DSA threshold. [Official manual](https://docs.ankiweb.net/deck-options.html#desired-retention)

### Boundaries and contrary results matter

Higham and colleagues (2023) ran three preregistered word-pair experiments. Requiring memory judgments changed the relative benefits of restudy and retrieval; without those judgments, retrieval outperformed restudy in their third experiment. The lesson is to measure the effects of our actual interaction design, not assume every activity labeled “active recall” works identically. [Open-access paper](https://link.springer.com/article/10.1007/s10648-023-09809-2)

Dunlosky and colleagues (2013) reviewed ten learning techniques. The publisher's research summary rates practice testing and distributed practice highly; the broad review supports those directions rather than a specific percentage formula for this product. Only the publisher abstract/summary was consulted here, not the full monograph. [Paper record](https://www.psychologicalscience.org/journals/pspi/1529100612453266/), [publisher research summary](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html)

## 3. Audit of the current tracker

This section is based on our source code, not published research. See [retention-policy.js](C:/Users/bhuva/Documents/Projects/dsa-tracker/apps/api/src/retention-policy.js) and [goal-policy.js](C:/Users/bhuva/Documents/Projects/dsa-tracker/apps/api/src/goal-policy.js).

| Current behavior | Why it needs reconsideration |
|---|---|
| One 30-day recency half-life | It is a product constant, not a measured personal forgetting rate. |
| Breadth/reinforcement/recency weights of 0.5/0.3/0.2 | These are heuristics; the papers do not establish those coefficients. |
| A persistent experience baseline | Useful as experience, but can conceal declining independent recall if labeled retention. |
| A 95 ceiling and 94 cap | An artificial limit can make progress feel unattainable. It is not a validated measurement safeguard. |
| A fixed boost for independent, hint, solution and imported-unknown activity | Assistance is informative, but exact update sizes need data. An import does not demonstrate independent recall. |
| Accepted captures dominate the recorded outcomes | Missing failed recall creates selection bias: successes alone cannot calibrate a probability. |
| The queue combines 65% goal gap with 35% practice weakness | A reasonable candidate policy to test, not a research-derived optimum. |
| Inverse attention, recently adjusted with a cube-root curve, becomes a percent bar | The number describes relative attention on a goal scale, not retained knowledge. Changing the curve changes appearance without adding evidence. |

The current code already preserves practiced approaches separately from provider tags and manual browsing placement. Keep that separation. A solution should update the approach actually practiced; importing more tags should not pretend the learner independently retrieved them all.

## 4. How a realistic bar should grow

### Define the task before displaying a percentage

Recommended assessment target: “Can I independently choose and reconstruct an appropriate approach for a representative problem in this subpattern?” Concept recall, plan recall and full implementation are related but different tasks. A short explanation check cannot be silently treated as proof of full coding performance.

Recommended product behavior, to validate with our own data:

| Event | Learning record | Retention evidence | Bar behavior |
|---|---|---|---|
| Import an old Accepted problem without its practice date | Increase historical coverage | Unknown | No fabricated fresh retention |
| First independent solve | Increase breadth and record the practiced approach | Initial, limited evidence | Begin assessment; show low confidence rather than claim mastery |
| Immediate repeat after reading the solution | Record guided learning | Weak evidence of independent recall | Avoid a large mastery jump |
| Independent success after a meaningful delay | Record successful spaced retrieval | Stronger evidence of durable learning | Raise current readiness and extend the expected useful interval |
| Success only after a hint | Record the assistance and what was missing | Partial recall | Give proportionate credit, with earlier follow-up than a clean success |
| Failure followed by solution study | Record a lapse and relearning | Negative evidence before feedback; learning afterward | Update the estimate, retain past history, arrange a shorter check |
| Cold success on an unfamiliar variant | Record transfer and the actual approach | Evidence beyond memorizing one answer | Strengthen evidence for that subpattern, with uncertainty |
| Time without practice | Retain historical experience | Increasing uncertainty/possible forgetting | Readiness may drift down; earned coverage stays |

The motivation should come from two visible accomplishments: higher readiness now and longer gaps before revision is needed. A stable pattern should not force daily practice to keep its display high.

### Separate short-term accessibility from durability

An illustrative model from half-life regression is `R(t) = 2^(-t/h)`, where R is estimated recall probability, t is time since practice and h is a learned half-life. Its form is useful for explanation; it is not a validated formula for this app. [Model source](https://aclanthology.org/P16-1174.pdf)

The following are hypothetical parameters, not predictions about your memory:

| Time since practice | Weak trace: h = 3 days | Durable trace: h = 30 days |
|---|---:|---:|
| 1 day | 79% | 98% |
| 3 days | 50% | 93% |
| 7 days | 20% | 85% |

An 85% bar can represent substantial progress if it now takes a week to decline to that point instead of a day. Showing only the instantaneous percent hides that achievement. A small “Next check” or “Stable across spaced checks” indicator can explain it without adding another competing chart.

### Make high values achievable without promising permanent perfection

For a retention estimate, remove arbitrary caps that exist only to keep the bar below 100. Still, do not promise that any learner will retain everything permanently, or force the estimate to 100 after every Accepted submission. Sample size and task difficulty matter.

For a completion bar, 100% can honestly mean all planned checks for the current session are completed, or the chosen coverage goal is met. A retention probability and a completed plan are different achievements. Until predictions are validated, use an “Estimated practice readiness” score or evidence states such as Learning, Recalled after a delay, and Stable across checks; do not label a heuristic a literal chance of solving any new problem.

### Aggregate subpatterns transparently

Assess representative tasks within a subpattern before combining them into a pattern. Avoid allowing ten easy tasks to hide an unassessed important subtype. Show the assessed share and the missing areas. Use a stable definition of the assessment set; otherwise adding a new subtype can change the average even when no memory has changed.

The full-pattern estimate should not refresh to near-full because one related problem was solved. A confirmed hashing approach should not also refresh DP, sorting and sliding window simply because those tags occur on its problem page.

## 5. When to revise

The research supports spaced, outcome-sensitive practice. It does not establish a universal 1–3–7–14–30-day coding schedule or a universally optimal 90% threshold.

For an initial implementation, the following is a **proposed conservative starter policy**, not a published experimental prescription:

| Recent outcome | Proposed next action |
|---|---|
| Could not explain the idea / needed the solution | Study the missing step, reconstruct once, then check again around the next day |
| Could explain it but required a meaningful hint | Check again in roughly 1–3 days |
| Independently recalled and implemented after a delay | Extend the interval; an initial follow-up might be roughly 3–7 days |
| Several successful checks on separate days | Extend further, potentially into weeks, based on performance |
| Solved only a memorized example | Add an unfamiliar variant before calling the pattern broadly stable |
| Interview is near | Bring relevant checks forward, while respecting daily time limits |

These windows need adjustment using observed delayed results. They are starting points for testing, not constants to treat as human-memory laws. Quick idea checks and full implementations should have separate time budgets.

With enough data, predict when the relevant task is likely to fall below a chosen readiness threshold and schedule before it becomes persistently inaccessible. An initial threshold around 85–90% could be investigated, but should remain a configurable experiment with workload measurement, not a scientific guarantee.

For a large imported collection, do not make all 393 problems immediately due. Seed representative checks in important subpatterns, identify weak areas, and expand assessment gradually. Missing dates should produce uncertainty, not invented deadlines.

## 6. How to revise DSA effectively

This workflow is our application of the evidence, not a procedure proven in one DSA trial:

1. **Attempt without cues.** Hide notes, the prior solution and the pattern label. State the approach before opening hints.
2. **Explain the structure.** Describe the invariant, maintained state, transitions or recurrence, and why the approach is appropriate. For hashing, identify the key/value meaning and how it avoids repeated work.
3. **Reconstruct at the required level.** Use pseudocode for a quick conceptual check; periodically write and test the implementation for coding readiness. Record which kind of check occurred.
4. **Check and correct.** Compare the approach, complexity and edge cases with reliable feedback. Identify the missing idea rather than simply viewing Accepted as sufficient explanation.
5. **Relearn when needed.** Study a worked example in meaningful subgoals. Close it and rebuild the essential reasoning. A same-session rebuild is learning, not proof of lasting recall.
6. **Return after a delay.** Begin the next check independently. Extend or shorten the following interval based on the result.
7. **Check transfer.** Use a different problem or changed constraint. Mix confusable techniques once their basic ideas are understood.

An example hashing revision can ask: What needs fast lookup? What is the map key? What must be stored? Must lookup happen before insertion? What happens with duplicates? Can I choose hashing when the problem is not already grouped under that label?

Do not prescribe lengthy blind struggle for every novice or full rewrites for every review. Match the activity to the missing skill and its cost. Worked examples and concise checks can coexist with independent retrieval.

## 7. Keep motivation and interview priority meaningful

Suggested visual contract:

- **Main bar:** estimated readiness for a defined task within this pattern, with assessed scope and uncertainty available.
- **Existing difficulty bars:** actual goal coverage; those remain cumulative achievements.
- **Queue position:** where this pattern belongs in the next-practice plan, influenced by relevance, revision need, coverage gaps and time cost.
- **Small durable-progress signal:** longer interval or a count of successful spaced checks.

An interview-relevant pattern can remain early in the queue even when its readiness is higher than that of a niche pattern. Forcing bars into an ascending percentage sequence would require redefining them as priority balance, which is precisely the ambiguity we are trying to remove. Profile changes should alter the queue and practice targets, not pretend the same memories suddenly became stronger or weaker.

A missed check should invite a manageable revision action. Completed coverage, successful spaced checks and past independent work remain visible. Do not fabricate extra retention to maintain motivation; communicate durable progress that the user actually earned.

## 8. Data needed before a retention probability is credible

Keep current immutable recording history and confirmed approach units. Add explicit review assessments, including unsuccessful ones, without automatically treating every Run or wrong submission as a failed memory retrieval.

Minimum useful fields:

- Assessed problem and practiced subpattern; known versus unfamiliar problem.
- Timestamp and elapsed time since prior relevant practice.
- Type of check: idea, plan, implementation or transfer.
- Outcome before feedback: independent, meaningful hint, solution needed, or unable to recall.
- Whether notes, labels or an editorial were visible.
- A rough effort/time measure and the intended retention deadline, when known.

Do not infer independent success solely from Accepted. A learner can receive Accepted after copying an explanation, and can fail a submission because of a typo despite understanding the pattern.

Imported solves remain useful coverage evidence, but they are not a substitute for delayed assessment. User-reported outcomes are still imperfect; the interface should make the categories clear and keep input small.

## 9. Validate the model and scheduler separately

Before choosing coefficients or a complex scheduler, establish a simple baseline and collect delayed assessments. Model accuracy and learning effectiveness are separate tests.

| Evaluation | What to measure |
|---|---|
| Probability calibration | When predicting about 80%, does roughly 80% of the defined assessments succeed? |
| Prediction quality | Brier score/log loss, compared with simple recency and constant baselines |
| Unseen transfer | Independent success on held-out variants, separately from familiar repeats |
| Long-term benefit | Delayed performance after a week and after several weeks |
| Efficiency | Retained capability per minute of practice, not raw streaks or sessions |
| Workload and motivation | Overdue burden, abandoned sessions and sustainable return behavior |
| Fairness of evaluation | Time-ordered holdouts; avoid leaking future outcomes or near-duplicate solutions into training |

An FSRS-inspired item scheduler could be useful for explicit recall checks. A skill-based model could better represent multiple problems sharing a subpattern. Neither should be presented as already validated for DSA because it performs well on vocabulary or algebra datasets. Test scheduling interventions against a practical baseline under comparable time budgets.

## 10. Recommended decisions before implementation

1. Choose what the main bar means: readiness for a defined assessment, with explicit uncertainty.
2. Keep coverage and priority distinct, even though they share the same dashboard.
3. Replace arbitrary appearance curves with evidence-driven updates; remove the fixed cosmetic ceiling.
4. Capture delayed review successes and lapses before attempting probability calibration.
5. Start with a modest adaptive schedule and representative checks, not a huge overdue queue.
6. Reward successful spaced checks with longer intervals and visible stable progress.
7. Test unfamiliar variants and strategy selection, not only exact-solution repetition.
8. Fit/validate parameters with our data; preserve existing imports and immutable attempts.

## 11. Source access and research limitations

Full-text sources were accessed for Cepeda 2008; Agarwal 2021; Rawson/Dunlosky 2022; Pashler 2005; Rohrer 2015; Brunmair/Richter 2019; Pan/Rickard 2018; Margulieux and colleagues 2020; Murre/Dros 2015; Settles/Meeder 2016; Eglington/Pavlik 2020; Choffin and colleagues 2019; and Higham and colleagues 2023. Reading focused on methods, findings and limitations relevant to this product, rather than every reference or supplementary file.

For Roediger/Karpicke 2006, Karpicke/Roediger 2008, Yang and colleagues 2021, and Dunlosky and colleagues 2013, the consulted material was the original publisher/database abstract or publisher research summary. Anki is official implementation documentation, not experimental evidence. Links throughout identify the consulted sources.

Most of this evidence concerns vocabulary, prose, classroom learning or mathematical procedures. The programming study concerns introductory programming. None establishes exact growth increments, decay rates, revision intervals, interview importance weights or an optimal number of solved DSA problems for our users. The report's schedules and interface proposals require validation; they are not hidden claims that those numbers came from papers.

The scoring code and UI have not been changed as part of this research task.
