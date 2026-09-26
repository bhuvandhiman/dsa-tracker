# Goal Coverage policy evidence

Policy version: `2026-09-26.v2`

Evidence last checked against the linked official sources: `2026-09-26`

This document separates external evidence from Recall's own product-policy choices. The sources below support the direction and relative emphasis of the goal system. They do **not** publish a universal 300, 500, or 1000-problem quota matrix, so Recall does not present its exact targets as industry facts.

## Trusted source evidence

### HackerRank Interview Preparation Kit

Source: https://www.hackerrank.com/interview/interview-preparation-kit

HackerRank's official Interview Preparation Kit currently states the share of companies that test these subjects:

| Subject | HackerRank figure |
| --- | ---: |
| Arrays | 70% |
| Dictionaries and Hashmaps | 40% |
| Sorting | 40% |
| String Manipulation | 40% |
| Greedy Algorithms | 31% |
| Search | 30% |
| Dynamic Programming | 27% |
| Stacks and Queues | 17% |
| Graphs | 15% |
| Trees | 12% |
| Linked Lists | 8% |
| Recursion and Backtracking | 5% |

Recall only uses direct semantic mappings from these subjects. For example, HackerRank's `Search` figure is **not** silently treated as a Binary Search frequency.

### LeetCode interview study plans

- LeetCode 75: https://leetcode.com/studyplan/leetcode-75/
- Top Interview 150: https://leetcode.com/studyplan/top-interview-150/
- Graph Theory: https://leetcode.com/studyplan/graph-theory/
- Dynamic Programming: https://leetcode.com/studyplan/dynamic-programming/

LeetCode describes LeetCode 75 as an interview-preparation plan with essential/trending problems and its Top Interview plan as a curated interview set. The graph and dynamic-programming plans provide additional evidence that those families contain multiple distinct techniques worth tracking rather than treating each family as one undifferentiated topic.

### MIT OpenCourseWare 6.006 Introduction to Algorithms

- Syllabus: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/syllabus/
- Lecture notes: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/

MIT 6.006 covers elementary data structures and algorithmic approaches including hashing, heaps, balanced search trees, graph searching, shortest paths, and dynamic programming. The lecture sequence separately covers BFS, DFS, weighted shortest paths, Dijkstra/Bellman-Ford, and multiple dynamic-programming lectures. Recall uses this as curriculum evidence for keeping meaningful graph/tree/DP subpatterns independent in the Deep Understanding profile.

### Princeton Algorithms, 4th Edition

Source: https://algs4.cs.princeton.edu/home/

Princeton's Algorithms booksite separates sorting/heaps, search trees and hashing, graph traversal, minimum spanning trees, shortest paths, and tries into distinct material. Recall uses this as additional curriculum evidence that a deeper goal should reserve room for advanced graph/tree/string structures rather than treating every category as a single flat bucket.

## Evidence-to-policy ledger

| Recall decision | External evidence | What Recall adds as product policy |
| --- | --- | --- |
| Interview Focused gives more room to arrays/hashmaps, search-related patterns, greedy, DP, stacks, graphs and trees than rare specialist topics. | HackerRank publishes topic incidence for its Interview Preparation Kit; Arrays is highest at 70%, followed by dictionaries/hashmaps, sorting and strings at 40%, with lower published figures for greedy, search, DP, stacks/queues, graphs, trees, linked lists, and backtracking. | Recall maps only semantically defensible parts of those subjects into its own catalog, then normalizes them into a complete target. The exact category percentages are not HackerRank percentages. |
| Interview goals emphasize Medium problems while retaining Easy foundations and some Hard depth. | LeetCode 75 and Top Interview 150 are official interview-prep plans spanning comprehensive interview topics, but they do not publish a universal difficulty quota for a 300/500/1000-problem lifetime target. | Recall defines its own difficulty mix and labels it as policy. |
| Larger goals should add depth rather than repeat the same proportions forever. | LeetCode distinguishes a shorter 75-problem interview plan from a broader 150-problem plan, while MIT and Princeton curricula separate advanced techniques such as shortest paths, MSTs, balanced trees, and multiple forms of DP. | Recall reduces the Easy share and raises the Hard share as targets grow, and gradually gives advanced subpatterns more of their parent category. |
| Deep Understanding should keep BFS, DFS, shortest paths, MST/union-find, tree structures and DP variants independently visible. | MIT 6.006 teaches BFS, DFS/topological sorting, shortest paths, and several DP lectures separately. Princeton also treats graph traversal, MSTs, shortest paths, search trees, hashing and tries as distinct algorithmic material. | Recall chooses the exact subpattern boundaries and quotas used in its catalog. |

## Recall product-policy choices

The following values are deliberate, versioned Recall policy. They are **not** claims copied from HackerRank, LeetCode, MIT, or any other source:

- Supported targets are 300, 500, and 1000 distinct solved problems.
- The two profiles are Interview Focused and Deep Understanding.
- Category weights convert the evidence above into a complete target across Recall's own catalog.
- Subpattern weights split a category target so a surplus in one technique cannot erase a gap in another.
- Interview Focused difficulty mix changes with goal size: 300 = 26% Easy / 64% Medium / 10% Hard; 500 = 22% / 63% / 15%; 1000 = 18% / 60% / 22%.
- Deep Understanding difficulty mix changes with goal size: 300 = 22% Easy / 60% Medium / 18% Hard; 500 = 18% / 57% / 25%; 1000 = 14% / 56% / 30%.
- Advanced tree, graph and DP subpatterns receive a smaller share in a 300-problem Interview Focused goal and progressively more room in larger or Deep Understanding goals.
- Every positively weighted subpattern receives at least one target slot when its parent category has enough capacity. Rare techniques can therefore stay low-priority without disappearing from the goal entirely.
- Integer quotas use deterministic largest-remainder allocation so every generated matrix totals exactly the selected 300/500/1000 target.
- Unknown-difficulty solves remain visible but receive no guessed difficulty credit.
- `Other / needs classification` has no target and stays outside Goal Coverage.

These values should change only through a new policy version plus regression tests. Historical practice data must never be rewritten when the policy version changes.

The exact weights are intentionally stored in code rather than copied from a source table because no trusted source publishes the exact Recall catalog or a universally correct 300/500/1000 lifetime quota. This document is the credibility trail: it records which parts are source-backed and which parts are versioned product judgment.

## Product invariants

- Goal Coverage is separate from Practice Strength. Changing a profile or target never changes retention, recency, assistance, notes, or attempt history.
- Each solved problem contributes at most one Goal Coverage credit through its current primary browsing placement.
- Re-solving a problem does not add Goal Coverage credit.
- Assistance level does not reduce Goal Coverage credit.
- Imported accepted problems count even when their solve date is unavailable.
- Difficulty buckets are independent: extra Easy solves cannot compensate for missing Medium or Hard coverage.
- Primary-placement corrections re-attribute Goal Coverage without rewriting confirmed attempt approaches.
