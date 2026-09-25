# Goal Coverage policy evidence

Policy version: `2026-09-26.v1`

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

## Recall product-policy choices

The following values are deliberate, versioned Recall policy. They are **not** claims copied from HackerRank, LeetCode, MIT, or any other source:

- Supported targets are 300, 500, and 1000 distinct solved problems.
- The two profiles are Interview Focused and Deep Understanding.
- Category weights convert the evidence above into a complete target across Recall's own catalog.
- Subpattern weights split a category target so a surplus in one technique cannot erase a gap in another.
- Interview Focused difficulty mix is 22% Easy, 63% Medium, 15% Hard.
- Deep Understanding difficulty mix is 18% Easy, 57% Medium, 25% Hard.
- Integer quotas use deterministic largest-remainder allocation so every generated matrix totals exactly the selected 300/500/1000 target.
- Unknown-difficulty solves remain visible but receive no guessed difficulty credit.
- `Other / needs classification` has no target and stays outside Goal Coverage.

These values should change only through a new policy version plus regression tests. Historical practice data must never be rewritten when the policy version changes.

## Product invariants

- Goal Coverage is separate from Practice Strength. Changing a profile or target never changes retention, recency, assistance, notes, or attempt history.
- Each solved problem contributes at most one Goal Coverage credit through its current primary browsing placement.
- Re-solving a problem does not add Goal Coverage credit.
- Assistance level does not reduce Goal Coverage credit.
- Imported accepted problems count even when their solve date is unavailable.
- Difficulty buckets are independent: extra Easy solves cannot compensate for missing Medium or Hard coverage.
- Primary-placement corrections re-attribute Goal Coverage without rewriting confirmed attempt approaches.

