# Pattern classification evidence

Evidence last checked: `2026-09-28`

Recall's browsing catalog is intentionally more specific than LeetCode's topic-tag vocabulary. The application never infers a derived pattern from a problem title. It uses either exact reviewed LeetCode problem identities, direct provider tags, or an unambiguous combination of provider tags.

## Trusted sources

- LeetCode Top Interview 150: https://leetcode.com/studyplan/top-interview-150/
- LeetCode Dynamic Programming study plan: https://leetcode.com/studyplan/dynamic-programming/
- Official LeetCode problem pages under `https://leetcode.com/problems/<title-slug>/`

LeetCode describes Top Interview 150 as covering comprehensive interview topics. Its Dynamic Programming study plan explicitly describes itself as covering ten essential/common DP patterns. Those sources support keeping meaningful interview families visible rather than flattening every problem to a single broad tag. The exact Recall boundaries below are still product taxonomy and are not presented as LeetCode-authored labels.

## Derived families

### Intervals

LeetCode currently has no `Intervals` topic tag in the provider topic payload used by Recall. Recall therefore maintains an exact-slug family for interval-centric problems. The current reviewed set is:

`merge-intervals`, `insert-interval`, `non-overlapping-intervals`, `meeting-rooms`, `meeting-rooms-ii`, `minimum-number-of-arrows-to-burst-balloons`, `interval-list-intersections`, `minimum-interval-to-include-each-query`, `find-right-interval`, `remove-covered-intervals`, `my-calendar-i`, `my-calendar-ii`, `my-calendar-iii`, `employee-free-time`, `remove-interval`, `range-module`, `divide-intervals-into-minimum-number-of-groups`, `data-stream-as-disjoint-intervals`, and `meeting-scheduler`.

Each identity is an official LeetCode title slug. The problem statement itself centers interval/range overlap, insertion, merging, scheduling, intersection, or interval querying. Broad Array, Sorting, Greedy, Heap, Binary Search, Design, Prefix Sum, Ordered Set, or Segment Tree tags remain preserved as provider metadata and correction candidates; they do not erase the derived interval browsing placement.

### Dynamic-programming subpatterns

LeetCode supplies broad `Dynamic Programming` / `Memoization` evidence but does not expose Recall's `1D DP`, `2D / grid DP`, `0/1 knapsack`, `Unbounded knapsack`, `Subsequence / string DP`, `Interval DP`, `State machine DP`, and `Multidimensional DP` units as provider topic tags. These therefore use reviewed exact identities in `apps/api/src/pattern-catalog.js`.

The classification rule is based on the state/transition structure of the accepted DP formulation, checked against the official problem identity and statement. When a problem has several materially different standard approaches and there is no stable primary Recall placement, it is intentionally left at Dynamic programming / General rather than guessed into a subtype.

### Tree and graph traversals

LeetCode does expose `Depth-First Search` and `Breadth-First Search`, but those tags are not tree-specific or graph-specific by themselves. Recall keeps them as provider evidence and derives a traversal child only from a supported combination:

- `Tree` + only DFS -> Tree / DFS
- `Tree` + only BFS -> Tree / Level order / BFS
- `Graph` + only DFS -> Graphs / DFS
- `Graph` + only BFS -> Graphs / BFS

If both DFS and BFS are supplied, the major family remains the default and both traversal children are offered as correction candidates. Reviewed exact identities can still choose a primary traversal for canonical problems.

## Direct provider mappings

These Recall children already have a matching LeetCode topic and should not be maintained as invented derived lists: Hash maps & sets (`Hash Table` / `Hash Function`), Binary Search Tree, Segment Tree, Binary Indexed Tree (Fenwick), Union Find, Topological Sort, Shortest Path, Minimum Spanning Tree, Monotonic Stack, Prefix Sum, Trie, Sliding Window, Two Pointers, Binary Search, Heap, Backtracking, Greedy and Bit Manipulation.

For Arrays & hashing, `Array` stays broad and maps to General / unspecified. `Hash Table` and `Hash Function` are preserved as the specific `hash-table` provider slug and map directly to Hash maps & sets. More specific algorithm tags such as Sliding Window or Two Pointers can still be the primary browsing placement while hashing remains available as a correction candidate.

Provider topics are evidence about possible techniques. They remain stored independently from the problem's one browsing placement and from the approach recorded on an attempt.
