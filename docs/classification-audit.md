# Classification audit — 2 October 2026

Read-only snapshot of the local workspace. No practice, placements, or goals were modified. The assignments below are deterministic defaults, not claims of optimal solutions.

Stored problems: 406. DSA-tracked: 392. Excluded non-DSA: 14. Problems with raw topics: 406. Manual overrides preserved: 10.

Goal coverage accounts for 389 primary-classified solves. The other three are Counter, Create Grid With Exactly One Path, and Create Hello World Function, whose provider topic lists are empty. They remain visible under Other with no invented DSA classification. Thus 389 + 3 + 14 = 406 stored identities. Goal credits may be lower because each difficulty quota caps credit separately.

## Count comparison

The running API may still use the previous classifier; updated counts are calculated from current code against the same stored data.

| Pattern | Running API primary count | Updated primary count | Updated classified solves |
|---|---:|---:|---:|
| Dynamic programming | 41 | 39 | 39 |
| Arrays & hashing | 109 | 101 | 101 |
| Graphs | 15 | 24 | 24 |
| Trees | 37 | 37 | 37 |
| Greedy | 19 | 18 | 18 |
| Intervals | 1 | 5 | 5 |
| Math & geometry | 19 | 19 | 19 |
| Stack | 22 | 22 | 22 |
| Heap / priority queue | 13 | 13 | 13 |
| Sliding window | 21 | 21 | 21 |
| Binary search | 21 | 21 | 21 |
| Linked list | 14 | 14 | 14 |
| Bit manipulation | 1 | 1 | 1 |
| Two pointers | 41 | 41 | 41 |
| Tries | 0 | 0 | 0 |
| Backtracking | 13 | 13 | 13 |
| Other / needs classification | 5 | 3 | 3 |

## Traversal details

| Approach | Classified solves | Practiced dated identities | Prior solves in practice evidence |
|---|---:|---:|---:|
| Graphs: DFS | 1 | 1 | 0 |
| Graphs: Shortest paths | 2 | 0 | 2 |
| Graphs: Topological sort | 3 | 0 | 3 |
| Graphs: General / unspecified | 2 | 2 | 2 |
| Graphs: BFS | 6 | 2 | 4 |
| Graphs: Minimum spanning trees | 0 | 0 | 0 |
| Graphs: Union find | 10 | 2 | 8 |
| Intervals: Intervals | 5 | 0 | 5 |

## All DSA assignments

Manual overrides take precedence. Alternatives indicate supported candidates, not extra coverage credit. General remains the default for ambiguous BFS/DFS.

| Problem | Primary unit | Source | Alternatives | Raw topics |
|---|---|---|---|---|
| 01 Matrix | graph-bfs | topic-fallback | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Breadth-First Search, Matrix |
| 3Sum | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers, Sorting |
| 3Sum Closest | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers, Sorting |
| Add Digits | math | topic-fallback |  | Math, Simulation, Number Theory |
| Add Two Numbers | linked-list | topic-fallback | math | Linked List, Math, Recursion |
| Aggregate Two Time Series | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers |
| All Paths From Source to Target | backtracking | topic-fallback | graphs-general, graph-dfs, graph-bfs | Backtracking, Depth-First Search, Breadth-First Search, Graph Theory, Directed Acyclic Graph |
| Assign Cookies | two-pointers | topic-fallback | greedy, arrays-hashing-general | Array, Two Pointers, Greedy, Sorting, Quicksort |
| Average of Levels in Binary Tree | trees-general | topic-fallback | tree-dfs, tree-bfs | Tree, Depth-First Search, Breadth-First Search, Binary Tree |
| Backspace String Compare | two-pointers | topic-fallback | stack-general, arrays-hashing-general | Two Pointers, String, Stack, Simulation |
| Bag of Tokens | two-pointers | topic-fallback | greedy, arrays-hashing-general | Array, Two Pointers, Greedy, Sorting |
| Balanced Binary Tree | tree-dfs | topic-fallback | trees-general | Tree, Depth-First Search, Binary Tree |
| Baseball Game | stack-general | topic-fallback | arrays-hashing-general | Array, Stack, Simulation |
| Best Time to Buy and Sell Stock | dynamic-programming-general | topic-fallback | arrays-hashing-general | Array, Dynamic Programming |
| Best Time to Buy and Sell Stock II | dynamic-programming-general | topic-fallback | greedy, arrays-hashing-general | Array, Dynamic Programming, Greedy |
| Best Time to Buy and Sell Stock III | state-machine-dp | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming |
| Best Time to Buy and Sell Stock IV | state-machine-dp | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming |
| Best Time to Buy and Sell Stock with Cooldown | state-machine-dp | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming |
| Best Time to Buy and Sell Stock with Transaction Fee | state-machine-dp | curated | dynamic-programming-general, greedy, arrays-hashing-general | Array, Dynamic Programming, Greedy |
| Binary Search | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Binary Search Tree Iterator | bst | topic-fallback | stack-general, trees-general | Stack, Tree, Design, Binary Search Tree, Binary Tree, Iterator |
| Binary Subarrays With Sum | sliding-window | topic-fallback | prefix-sum, hashing, arrays-hashing-general | Array, Hash Table, Sliding Window, Prefix Sum |
| Binary Tree Inorder Traversal | tree-dfs | topic-fallback | stack-general, trees-general | Stack, Tree, Depth-First Search, Binary Tree |
| Binary Tree Level Order Traversal | tree-bfs | topic-fallback | trees-general | Tree, Breadth-First Search, Binary Tree |
| Binary Tree Maximum Path Sum | tree-dfs | topic-fallback | dynamic-programming-general, trees-general | Dynamic Programming, Tree, Depth-First Search, Binary Tree, DP on Trees |
| Binary Tree Paths | backtracking | topic-fallback | tree-dfs, trees-general, arrays-hashing-general | String, Backtracking, Tree, Depth-First Search, Binary Tree |
| Binary Tree Postorder Traversal | tree-dfs | topic-fallback | stack-general, trees-general | Stack, Tree, Depth-First Search, Binary Tree |
| Binary Tree Preorder Traversal | tree-dfs | topic-fallback | stack-general, trees-general | Stack, Tree, Depth-First Search, Binary Tree |
| Binary Tree Right Side View | trees-general | topic-fallback | tree-dfs, tree-bfs | Tree, Depth-First Search, Breadth-First Search, Binary Tree |
| Binary Tree Tilt | tree-dfs | topic-fallback | trees-general | Tree, Depth-First Search, Binary Tree, DP on Trees |
| Binary Tree Zigzag Level Order Traversal | tree-bfs | topic-fallback | trees-general | Tree, Breadth-First Search, Binary Tree |
| Boats to Save People | two-pointers | topic-fallback | greedy, arrays-hashing-general | Array, Two Pointers, Greedy, Sorting, Timsort |
| Break a Palindrome | greedy | topic-fallback | arrays-hashing-general | String, Greedy |
| Broken Calculator | greedy | topic-fallback | math | Math, Greedy |
| Build Array from Permutation | arrays-hashing-general | topic-fallback |  | Array, Simulation |
| Burst Balloons | interval-dp | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming |
| Capacity To Ship Packages Within D Days | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Check Adjacent Digit Differences | arrays-hashing-general | topic-fallback |  | String |
| Check ASCII Palindromic | two-pointers | topic-fallback | bit-manipulation, arrays-hashing-general | Two Pointers, String, Bit Manipulation |
| Check Divisibility by Digit Sum and Product | math | topic-fallback |  | Math |
| Check Good Integer | math | topic-fallback |  | Math, Simulation |
| Check if Array Is Sorted and Rotated | arrays-hashing-general | topic-fallback |  | Array |
| Cherry Pickup | multidimensional-dp | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Matrix |
| Cherry Pickup II | multidimensional-dp | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Matrix |
| Climbing Stairs | dp-1d | curated | dynamic-programming-general, math | Math, Dynamic Programming, Memoization |
| Coin Change | graph-bfs | topic-fallback | knapsack-unbounded, dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Breadth-First Search, Knapsack Problem, Complete Knapsack |
| Combination Sum | backtracking | topic-fallback | arrays-hashing-general | Array, Backtracking |
| Concatenate Array With Reverse | arrays-hashing-general | topic-fallback |  | Array, Simulation |
| Concatenate Non-Zero Digits and Multiply by Sum I | math | topic-fallback |  | Math |
| Concatenation of Array | arrays-hashing-general | topic-fallback |  | Array, Simulation |
| Construct Binary Tree from Preorder and Inorder Traversal | hashing | topic-fallback | trees-general, arrays-hashing-general | Array, Hash Table, Divide and Conquer, Tree, Binary Tree |
| Construct Uniform Parity Array I | arrays-hashing-general | topic-fallback | math | Array, Math |
| Construct Uniform Parity Array II | arrays-hashing-general | topic-fallback | math | Array, Math |
| Container With Most Water | two-pointers | topic-fallback | greedy, arrays-hashing-general | Array, Two Pointers, Greedy |
| Contains Duplicate | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Sorting |
| Contains Duplicate II | sliding-window | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Sliding Window |
| Contiguous Array | prefix-sum | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Prefix Sum |
| Count Commas in Range | math | topic-fallback |  | Math |
| Count Commas in Range II | math | topic-fallback |  | Math |
| Count Complete Tree Nodes | binary-search | topic-fallback | bit-manipulation, trees-general | Binary Search, Bit Manipulation, Tree, Binary Tree |
| Count Digit Appearances | arrays-hashing-general | topic-fallback | math | Array, Math |
| Count Dominant Indices | arrays-hashing-general | topic-fallback |  | Array, Enumeration |
| Count Dominant Nodes in a Binary Tree | tree-dfs | topic-fallback | trees-general | Tree, Depth-First Search, Binary Tree |
| Count Indices With Opposite Parity | arrays-hashing-general | topic-fallback |  | Array |
| Count Integers Appearing in a Single Block | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Counting |
| Count K-th Roots in a Range | binary-search | topic-fallback | math | Math, Binary Search |
| Count Nodes Equal to Average of Subtree | tree-dfs | topic-fallback | trees-general | Tree, Depth-First Search, Binary Tree |
| Count Rotations With Exactly K Equal Adjacent Pairs | sliding-window | topic-fallback | arrays-hashing-general | String, Sliding Window, Enumeration |
| Count Square Submatrices with All Ones | dp-2d | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Matrix |
| Count Subarrays With Majority Element I | segment-tree | topic-fallback | prefix-sum, hashing, arrays-hashing-general | Array, Hash Table, Divide and Conquer, Segment Tree, Merge Sort, Counting, Prefix Sum |
| Count the Digits That Divide a Number | math | topic-fallback |  | Math |
| Count Valid Prefixes | arrays-hashing-general | topic-fallback |  | String, Counting |
| Count Valid Word Occurrences | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, String, Counting |
| Count Values With Equally Spaced Occurrences I | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table |
| Count Values With Equally Spaced Occurrences II | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table |
| Counter | other | unclassified |  |  |
| Course Schedule | topological-sort | topic-fallback | graphs-general, graph-dfs, graph-bfs | Depth-First Search, Breadth-First Search, Graph Theory, Topological Sort, Directed Acyclic Graph |
| Course Schedule II | topological-sort | topic-fallback | graphs-general, graph-dfs, graph-bfs | Depth-First Search, Breadth-First Search, Graph Theory, Topological Sort |
| Create Grid With Exactly One Path | other | unclassified |  |  |
| Create Hello World Function | other | unclassified |  |  |
| Cyclically Shift Rows and Columns | arrays-hashing-general | topic-fallback |  | Array, Matrix, Simulation |
| Daily Temperatures | monotonic-stack | topic-fallback | stack-general, arrays-hashing-general | Array, Stack, Monotonic Stack |
| Decode Ways | dp-1d | curated | dynamic-programming-general, arrays-hashing-general | String, Dynamic Programming |
| Deepest Leaves Sum | trees-general | topic-fallback | tree-dfs, tree-bfs | Tree, Depth-First Search, Breadth-First Search, Binary Tree |
| Delete and Earn | dp-1d | curated | dynamic-programming-general, hashing, arrays-hashing-general | Array, Hash Table, Dynamic Programming |
| Delete Node in a BST | bst | topic-fallback | trees-general | Tree, Binary Search Tree, Binary Tree |
| Delete Operation for Two Strings | sequence-dp | curated | dynamic-programming-general, arrays-hashing-general | String, Dynamic Programming, Longest Common Subsequence |
| Delete the Middle Node of a Linked List | linked-list | topic-fallback | two-pointers | Linked List, Two Pointers |
| Determine if Two Strings Are Close | hashing | topic-fallback | arrays-hashing-general | Hash Table, String, Sorting, Counting |
| Diameter of Binary Tree | tree-dfs | topic-fallback | trees-general | Tree, Depth-First Search, Binary Tree, DP on Trees |
| Digit Frequency Score | hashing | topic-fallback | math | Hash Table, Math |
| Distinct Subsequences | sequence-dp | curated | dynamic-programming-general, arrays-hashing-general | String, Dynamic Programming |
| Distribute Elements Into Two Arrays I | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers, Simulation |
| Divisible and Non-divisible Sums Difference | math | topic-fallback |  | Math |
| Earliest Possible Day of Full Bloom | greedy | topic-fallback | arrays-hashing-general | Array, Greedy, Sorting |
| Edit Distance | sequence-dp | curated | dynamic-programming-general, arrays-hashing-general | String, Dynamic Programming |
| Equal Row and Column Pairs | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Matrix, Simulation |
| Evaluate Reverse Polish Notation | stack-general | topic-fallback | arrays-hashing-general, math | Array, Math, Stack |
| Evaluate the Bracket Pairs of a String | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, String |
| Even Number of Knight Moves | arrays-hashing-general | topic-fallback | math | Array, Math |
| Fibonacci Number | dp-1d | curated | dynamic-programming-general, math | Math, Dynamic Programming, Recursion, Memoization |
| Find All Anagrams in a String | sliding-window | topic-fallback | hashing, arrays-hashing-general | Hash Table, String, Sliding Window |
| Find All Duplicates in an Array | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Sorting |
| Find All Numbers Disappeared in an Array | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table |
| Find All Numbers Disappeared in an Array II | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search, Sorting |
| Find Closest Node to Given Two Nodes | graph-dfs | topic-fallback | graphs-general | Depth-First Search, Graph Theory |
| Find First and Last Position of Element in Sorted Array | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Find Greatest Common Divisor of Array | arrays-hashing-general | topic-fallback | math | Array, Math, Number Theory, Euclidean Algorithm, Greatest Common Divisor |
| Find if Path Exists in Graph | union-find | topic-fallback | graphs-general, graph-dfs, graph-bfs | Depth-First Search, Breadth-First Search, Union-Find, Graph Theory |
| Find Largest Value in Each Tree Row | trees-general | topic-fallback | tree-dfs, tree-bfs | Tree, Depth-First Search, Breadth-First Search, Binary Tree |
| Find Minimum in Rotated Sorted Array | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Find Missing Elements | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Sorting |
| Find Peak Element | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Find Pivot Index | prefix-sum | topic-fallback | arrays-hashing-general | Array, Prefix Sum |
| Find Players With Zero or One Losses | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Sorting, Counting |
| Find the Duplicate Number | two-pointers | topic-fallback | binary-search, bit-manipulation, arrays-hashing-general | Array, Two Pointers, Binary Search, Bit Manipulation, Pigeonhole Principle, Floyd's Cycle Finding Algorithm |
| Find the Highest Altitude | prefix-sum | topic-fallback | arrays-hashing-general | Array, Prefix Sum |
| Find the Index of the First Occurrence in a String | two-pointers | topic-fallback | arrays-hashing-general | Two Pointers, String, String Matching, Z Algorithm, Knuth–Morris–Pratt Algorithm, Boyer–Moore String-Search Algorithm |
| Find the Smallest Balanced Index | prefix-sum | topic-fallback | arrays-hashing-general | Array, Prefix Sum |
| Find the Smallest Divisor Given a Threshold | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Find the Winner of the Circular Game | arrays-hashing-general | topic-fallback | math | Array, Math, Recursion, Queue, Simulation |
| First Element with Unique Frequency | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Counting |
| First Matching Character From Both Ends | two-pointers | topic-fallback | arrays-hashing-general | Two Pointers, String |
| First Unique Character in a String | hashing | topic-fallback | arrays-hashing-general | Hash Table, String, Queue, Counting |
| First Unique Even Element | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Counting |
| Flood Fill | graphs-general | topic-fallback | graph-dfs, graph-bfs, arrays-hashing-general | Array, Depth-First Search, Breadth-First Search, Matrix |
| Fruit Into Baskets | sliding-window | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Sliding Window |
| GCD of Odd and Even Sums | math | topic-fallback |  | Math, Number Theory |
| Generate Parentheses | backtracking | topic-fallback | dynamic-programming-general, arrays-hashing-general | String, Dynamic Programming, Backtracking, Bracket Sequences |
| H-Index | arrays-hashing-general | topic-fallback |  | Array, Sorting, Counting Sort |
| Happy Number | two-pointers | topic-fallback | hashing, math | Hash Table, Math, Two Pointers, Floyd's Cycle Finding Algorithm |
| House Robber | dp-1d | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming |
| House Robber II | dp-1d | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming |
| How Many Numbers Are Smaller Than the Current Number | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Sorting, Counting Sort |
| Implement Queue using Stacks | stack-general | topic-fallback |  | Stack, Design, Queue |
| Implement Stack using Queues | stack-general | topic-fallback |  | Stack, Design, Queue |
| Insert Interval | intervals | curated | arrays-hashing-general | Array |
| Insert into a Binary Search Tree | bst | topic-fallback | trees-general | Tree, Binary Search Tree, Binary Tree |
| Interleaving String | sequence-dp | curated | dynamic-programming-general, arrays-hashing-general | String, Dynamic Programming |
| Intersection of Two Arrays | two-pointers | topic-fallback | binary-search, hashing, arrays-hashing-general | Array, Hash Table, Two Pointers, Binary Search, Sorting |
| Intersection of Two Linked Lists | linked-list | topic-fallback | two-pointers, hashing | Hash Table, Linked List, Two Pointers |
| Interval List Intersections | two-pointers | topic-fallback | intervals, arrays-hashing-general | Array, Two Pointers, Sweep Line |
| Invert Binary Tree | trees-general | topic-fallback | tree-dfs, tree-bfs | Tree, Depth-First Search, Breadth-First Search, Binary Tree |
| Is Graph Bipartite? | union-find | topic-fallback | graphs-general, graph-dfs, graph-bfs | Depth-First Search, Breadth-First Search, Union-Find, Graph Theory, Graph Coloring, Bipartite Graph |
| Is Subsequence | two-pointers | topic-fallback | dynamic-programming-general, arrays-hashing-general | Two Pointers, String, Dynamic Programming |
| Isomorphic Strings | hashing | topic-fallback | arrays-hashing-general | Hash Table, String |
| Jewels and Stones | hashing | topic-fallback | arrays-hashing-general | Hash Table, String |
| Jump Game | dynamic-programming-general | topic-fallback | greedy, arrays-hashing-general | Array, Dynamic Programming, Greedy |
| K-th Symbol in Grammar | math | manual | bit-manipulation | Math, Bit Manipulation, Recursion |
| K Closest Points to Origin | heap | topic-fallback | arrays-hashing-general, math | Array, Math, Divide and Conquer, Geometry, Sorting, Heap (Priority Queue), Quickselect, K-D Tree |
| Keys and Rooms | graphs-general | topic-fallback | graph-dfs, graph-bfs | Depth-First Search, Breadth-First Search, Graph Theory |
| Koko Eating Bananas | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Kth Largest Element in a Stream | bst | topic-fallback | heap, trees-general | Tree, Design, Binary Search Tree, Heap (Priority Queue), Binary Tree, Data Stream |
| Kth Largest Element in an Array | heap | topic-fallback | arrays-hashing-general | Array, Divide and Conquer, Sorting, Heap (Priority Queue), Quickselect |
| Kth Missing Positive Number | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Kth Smallest Element in a BST | bst | topic-fallback | tree-dfs, trees-general | Tree, Depth-First Search, Binary Search Tree, Binary Tree |
| Largest Integer With Given Digit Sum | greedy | topic-fallback | math | Math, Greedy |
| Largest Odd Number in String | greedy | topic-fallback | math, arrays-hashing-general | Math, String, Greedy |
| Largest Rectangle in Histogram | monotonic-stack | topic-fallback | stack-general, arrays-hashing-general | Array, Stack, Monotonic Stack, Range Minimum/Maximum Query |
| Last Stone Weight | heap | topic-fallback | arrays-hashing-general | Array, Heap (Priority Queue) |
| Left and Right Sum Differences | prefix-sum | topic-fallback | arrays-hashing-general | Array, Prefix Sum |
| Lemonade Change | greedy | topic-fallback | arrays-hashing-general | Array, Greedy |
| Length of Last Word | arrays-hashing-general | topic-fallback |  | String |
| Length of Longest Subarray With at Most K Frequency | sliding-window | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Sliding Window |
| Letter Case Permutation | backtracking | topic-fallback | bit-manipulation, arrays-hashing-general | String, Backtracking, Bit Manipulation |
| Lexicographically Smallest Equivalent String | union-find | topic-fallback | arrays-hashing-general | String, Union-Find |
| Limit Occurrences in Sorted Array | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers |
| Linked List Cycle | linked-list | topic-fallback | two-pointers, hashing | Hash Table, Linked List, Two Pointers, Floyd's Cycle Finding Algorithm |
| Linked List Cycle II | linked-list | topic-fallback | two-pointers, hashing | Hash Table, Linked List, Two Pointers, Floyd's Cycle Finding Algorithm |
| Longest Common Prefix | arrays-hashing-general | manual | trie | Array, String, Trie |
| Longest Common Subsequence | sequence-dp | curated | dynamic-programming-general, arrays-hashing-general | String, Dynamic Programming, Longest Common Subsequence |
| Longest Consecutive Sequence | union-find | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Union-Find |
| Longest Increasing Path in a Matrix | topological-sort | topic-fallback | graphs-general, graph-dfs, graph-bfs, dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Depth-First Search, Breadth-First Search, Graph Theory, Topological Sort, Memoization, Matrix, Directed Acyclic Graph |
| Longest Increasing Subsequence | binary-search | topic-fallback | sequence-dp, dynamic-programming-general, arrays-hashing-general | Array, Binary Search, Dynamic Programming, Longest Increasing Subsequence |
| Longest Palindrome by Concatenating Two Letter Words | greedy | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, String, Greedy, Counting |
| Longest Palindromic Subsequence | sequence-dp | curated | dynamic-programming-general, arrays-hashing-general | String, Dynamic Programming |
| Longest Repeating Character Replacement | sliding-window | topic-fallback | hashing, arrays-hashing-general | Hash Table, String, Sliding Window |
| Longest Subarray With at Most K Distinct Prime Factors | sliding-window | topic-fallback | hashing, arrays-hashing-general, math | Array, Hash Table, Math, Sliding Window, Number Theory |
| Longest Substring Without Repeating Characters | sliding-window | topic-fallback | hashing, arrays-hashing-general | Hash Table, String, Sliding Window |
| Lowest Common Ancestor of a Binary Tree | tree-dfs | topic-fallback | trees-general | Tree, Depth-First Search, Binary Tree, Binary Lifting, Lowest Common Ancestor |
| Majority Element | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Divide and Conquer, Sorting, Counting, Boyer–Moore Majority Vote Algorithm |
| Majority Frequency Characters | hashing | topic-fallback | arrays-hashing-general | Hash Table, String, Counting |
| Make The String Great | stack-general | topic-fallback | arrays-hashing-general | String, Stack |
| Max Area of Island | union-find | topic-fallback | graphs-general, graph-dfs, graph-bfs, arrays-hashing-general | Array, Depth-First Search, Breadth-First Search, Union-Find, Matrix |
| Max Consecutive Ones | arrays-hashing-general | topic-fallback |  | Array |
| Max Consecutive Ones III | sliding-window | topic-fallback | binary-search, prefix-sum, arrays-hashing-general | Array, Binary Search, Sliding Window, Prefix Sum |
| Max Increase to Keep City Skyline | greedy | topic-fallback | arrays-hashing-general | Array, Greedy, Matrix |
| Max Number of K-Sum Pairs | two-pointers | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Two Pointers, Sorting |
| Maximal Rectangle | monotonic-stack | topic-fallback | dynamic-programming-general, stack-general, arrays-hashing-general | Array, Dynamic Programming, Stack, Matrix, Monotonic Stack |
| Maximal Score After Applying K Operations | heap | topic-fallback | greedy, arrays-hashing-general | Array, Greedy, Heap (Priority Queue) |
| Maximal Square | dp-2d | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Matrix |
| Maximum 69 Number | greedy | topic-fallback | math | Math, Greedy |
| Maximum Average Subarray I | sliding-window | topic-fallback | arrays-hashing-general | Array, Sliding Window |
| Maximum Depth of Binary Tree | trees-general | topic-fallback | tree-dfs, tree-bfs | Tree, Depth-First Search, Breadth-First Search, Binary Tree |
| Maximum Equal Adjacent Pairs After at Most One Replacement | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Counting |
| Maximum Ice Cream Bars | greedy | topic-fallback | arrays-hashing-general | Array, Greedy, Sorting, Counting Sort |
| Maximum Length Substring With Two Occurrences | sliding-window | topic-fallback | hashing, arrays-hashing-general | Hash Table, String, Sliding Window |
| Maximum Manhattan Distance After All Moves | math | topic-fallback | arrays-hashing-general | Math, String, Counting |
| Maximum Nesting Depth of the Parentheses | stack-general | topic-fallback | arrays-hashing-general | String, Stack, Bracket Sequences |
| Maximum Number of Balloons | hashing | topic-fallback | arrays-hashing-general | Hash Table, String, Counting |
| Maximum Number of Vowels in a Substring of Given Length | sliding-window | topic-fallback | arrays-hashing-general | String, Sliding Window |
| Maximum Product of Two Elements in an Array | heap | topic-fallback | arrays-hashing-general | Array, Sorting, Heap (Priority Queue) |
| Maximum Subarray | dynamic-programming-general | topic-fallback | arrays-hashing-general | Array, Divide and Conquer, Dynamic Programming |
| Maximum Sum of Almost Unique Subarray | sliding-window | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Sliding Window |
| Maximum Total Sum of K Selected Elements | greedy | topic-fallback | arrays-hashing-general | Array, Greedy, Sorting |
| Maximum Valid Pair Sum | arrays-hashing-general | topic-fallback |  | Array, Enumeration |
| Maximum Valid Split Positions I | arrays-hashing-general | topic-fallback | math | Array, Math, Enumeration, Number Theory |
| Median of Two Sorted Arrays | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search, Divide and Conquer |
| Merge Adjacent Equal Elements | stack-general | topic-fallback | arrays-hashing-general | Array, Stack, Simulation |
| Merge Close Characters | hashing | topic-fallback | arrays-hashing-general | Hash Table, String, Simulation |
| Merge Intervals | intervals | curated | arrays-hashing-general | Array, Sorting, Quicksort |
| Merge Sorted Array | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers, Sorting |
| Merge Strings Alternately | two-pointers | topic-fallback | arrays-hashing-general | Two Pointers, String |
| Merge Two Sorted Lists | linked-list | topic-fallback |  | Linked List, Recursion |
| Middle of the Linked List | linked-list | topic-fallback | two-pointers | Linked List, Two Pointers |
| Min Cost Climbing Stairs | dp-1d | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming |
| Min Stack | stack-general | topic-fallback |  | Stack, Design |
| Minimize Array Sum Using Divisible Replacements | greedy | topic-fallback | hashing, arrays-hashing-general, math | Array, Hash Table, Math, Greedy, Number Theory |
| Minimize the Maximum Waiting Time at Synchronized Traffic Lights | greedy | topic-fallback | arrays-hashing-general | Array, Greedy |
| Minimum Absolute Difference Between Two Values | arrays-hashing-general | topic-fallback |  | Array, Enumeration |
| Minimum Absolute Difference in BST | bst | topic-fallback | trees-general, tree-dfs, tree-bfs | Tree, Depth-First Search, Breadth-First Search, Binary Search Tree, Binary Tree |
| Minimum Add to Make Parentheses Valid | greedy | topic-fallback | stack-general, arrays-hashing-general | String, Stack, Greedy, Bracket Sequences |
| Minimum Bishop Moves to Reach Target | arrays-hashing-general | topic-fallback | math | Array, Math |
| Minimum Capacity Box | arrays-hashing-general | topic-fallback |  | Array |
| Minimum Cost of Buying Candies With Discount | greedy | topic-fallback | arrays-hashing-general | Array, Greedy, Sorting |
| Minimum Cost to Cut a Stick | interval-dp | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Sorting |
| Minimum Cost to Equalize Arrays Using Swaps | greedy | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Greedy, Counting |
| Minimum Cost to Split into Ones | math | manual | dynamic-programming-general | Math, Dynamic Programming |
| Minimum Element After Replacement With Digit Sum | arrays-hashing-general | topic-fallback | math | Array, Math |
| Minimum Falling Path Sum | dp-2d | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Matrix |
| Minimum Flips to Make Binary String Coherent | arrays-hashing-general | topic-fallback |  | String |
| Minimum Genetic Mutation | graph-bfs | topic-fallback | hashing, arrays-hashing-general | Hash Table, String, Breadth-First Search, Bidirectional Search |
| Minimum K to Reduce Array Within Limit | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Minimum Number of Arrows to Burst Balloons | intervals | curated | greedy, arrays-hashing-general | Array, Greedy, Sorting |
| Minimum Operations to Reduce X to Zero | sliding-window | topic-fallback | binary-search, prefix-sum, hashing, arrays-hashing-general | Array, Hash Table, Binary Search, Sliding Window, Prefix Sum |
| Minimum Path Sum | dp-2d | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Matrix |
| Minimum Prefix Removal to Make Array Strictly Increasing | arrays-hashing-general | topic-fallback |  | Array |
| Minimum Queen Moves to Reach Target | arrays-hashing-general | topic-fallback | math | Array, Math |
| Minimum Remove to Make Valid Parentheses | stack-general | topic-fallback | arrays-hashing-general | String, Stack |
| Minimum Size Subarray Sum | sliding-window | topic-fallback | binary-search, prefix-sum, arrays-hashing-general | Array, Binary Search, Sliding Window, Prefix Sum |
| Minimum Swaps to Move Zeros to End | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers |
| Minimum Time to Collect All Apples in a Tree | trees-general | topic-fallback | tree-dfs, tree-bfs, hashing | Hash Table, Tree, Depth-First Search, Breadth-First Search, DP on Trees |
| Minimum Time to Make Rope Colorful | dynamic-programming-general | topic-fallback | greedy, arrays-hashing-general | Array, String, Dynamic Programming, Greedy |
| Minimum Total Cost to Process All Elements | arrays-hashing-general | topic-fallback | math | Array, Math, Simulation |
| Missing Number | binary-search | topic-fallback | bit-manipulation, hashing, arrays-hashing-general, math | Array, Hash Table, Math, Binary Search, Bit Manipulation, Sorting |
| Most Stones Removed with Same Row or Column | union-find | topic-fallback | graph-dfs, hashing, graphs-general | Hash Table, Depth-First Search, Union-Find, Graph Theory, Bipartite Graph |
| Move Zeroes | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers |
| My Calendar II | segment-tree | topic-fallback | binary-search, prefix-sum, intervals, arrays-hashing-general | Array, Binary Search, Design, Segment Tree, Prefix Sum, Ordered Set |
| N-Queens | backtracking | topic-fallback | arrays-hashing-general | Array, Backtracking, Algorithm X |
| N-Repeated Element in Size 2N Array | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Pigeonhole Principle |
| Nearest Available Drone | arrays-hashing-general | topic-fallback |  | Array, Enumeration |
| Nearest Exit from Entrance in Maze | graph-bfs | topic-fallback | arrays-hashing-general | Array, Breadth-First Search, Matrix |
| Network Delay Time | shortest-path | topic-fallback | heap, graphs-general, graph-dfs, graph-bfs | Depth-First Search, Breadth-First Search, Graph Theory, Heap (Priority Queue), Shortest Path, Dijkstra's Algorithm |
| Next Greater Element I | monotonic-stack | topic-fallback | stack-general, hashing, arrays-hashing-general | Array, Hash Table, Stack, Monotonic Stack |
| Next Greater Element II | monotonic-stack | topic-fallback | stack-general, arrays-hashing-general | Array, Stack, Monotonic Stack |
| Next Permutation | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers |
| Non-overlapping Intervals | intervals | manual | dynamic-programming-general, greedy, arrays-hashing-general | Array, Dynamic Programming, Greedy, Sorting |
| Number of Elapsed Seconds Between Two Times | math | topic-fallback | arrays-hashing-general | Math, String |
| Number of Enclaves | union-find | topic-fallback | graphs-general, graph-dfs, graph-bfs, arrays-hashing-general | Array, Depth-First Search, Breadth-First Search, Union-Find, Matrix |
| Number of Intersecting Interval Pairs I | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search, Sorting, Enumeration |
| Number of Islands | union-find | topic-fallback | graphs-general, graph-dfs, graph-bfs, arrays-hashing-general | Array, Depth-First Search, Breadth-First Search, Union-Find, Matrix |
| Number of Nodes in the Sub-Tree With the Same Label | trees-general | topic-fallback | tree-dfs, tree-bfs, hashing, arrays-hashing-general | Hash Table, Tree, Depth-First Search, Breadth-First Search, Counting, DP on Trees |
| Number of Prefix Connected Groups | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, String, Counting |
| Number of Provinces | union-find | topic-fallback | graphs-general, graph-dfs, graph-bfs | Depth-First Search, Breadth-First Search, Union-Find, Graph Theory |
| Number of Strings That Appear as Substrings in Word | arrays-hashing-general | topic-fallback |  | Array, String |
| Number of Substrings Containing All Three Characters | sliding-window | topic-fallback | hashing, arrays-hashing-general | Hash Table, String, Sliding Window |
| Odd Even Linked List | linked-list | topic-fallback |  | Linked List |
| Ones and Zeroes | knapsack-01 | curated | dynamic-programming-general, arrays-hashing-general | Array, String, Dynamic Programming, Knapsack Problem, 0-1 Knapsack |
| Out of Boundary Paths | multidimensional-dp | curated | dynamic-programming-general | Dynamic Programming |
| Palindrome Linked List | linked-list | topic-fallback | two-pointers, stack-general | Linked List, Two Pointers, Stack, Recursion |
| Palindrome Number | math | topic-fallback |  | Math |
| Partition Array According to Given Pivot | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers, Simulation |
| Partition Equal Subset Sum | knapsack-01 | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Knapsack Problem, 0-1 Knapsack |
| Pascal's Triangle | dp-2d | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming |
| Password Strength | hashing | topic-fallback | arrays-hashing-general | Hash Table, String |
| Path Sum | trees-general | topic-fallback | tree-dfs, tree-bfs | Tree, Depth-First Search, Breadth-First Search, Binary Tree |
| Path Sum II | backtracking | topic-fallback | tree-dfs, trees-general | Backtracking, Tree, Depth-First Search, Binary Tree |
| Path Sum III | tree-dfs | topic-fallback | trees-general | Tree, Depth-First Search, Binary Tree |
| Path With Minimum Effort | shortest-path | topic-fallback | union-find, binary-search, heap, graphs-general, graph-dfs, graph-bfs, arrays-hashing-general | Array, Binary Search, Depth-First Search, Breadth-First Search, Union-Find, Heap (Priority Queue), Matrix, Dijkstra's Algorithm |
| Permutation in String | sliding-window | topic-fallback | two-pointers, hashing, arrays-hashing-general | Hash Table, Two Pointers, String, Sliding Window |
| Permutations | backtracking | topic-fallback | arrays-hashing-general | Array, Backtracking |
| Plus One | arrays-hashing-general | topic-fallback | math | Array, Math |
| Possible Bipartition | union-find | topic-fallback | graphs-general, graph-dfs, graph-bfs | Depth-First Search, Breadth-First Search, Union-Find, Graph Theory, Graph Coloring, Bipartite Graph |
| Pow(x, n) | math | topic-fallback |  | Math, Recursion |
| Power of Two | math | manual | bit-manipulation | Math, Bit Manipulation, Recursion |
| Process String with Special Operations I | arrays-hashing-general | topic-fallback |  | String, Simulation |
| Product of Array Except Self | prefix-sum | topic-fallback | arrays-hashing-general | Array, Prefix Sum |
| Range Sum of BST | bst | topic-fallback | tree-dfs, trees-general | Tree, Depth-First Search, Binary Search Tree, Binary Tree |
| Ransom Note | hashing | topic-fallback | arrays-hashing-general | Hash Table, String, Counting |
| Rearrange Array by Removing Distinct Values | heap | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Sorting, Heap (Priority Queue), Simulation, Counting, Ordered Set |
| Rearrange Array Elements by Sign | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers, Simulation |
| Rectangle Overlap | math | topic-fallback |  | Math, Geometry |
| Regular Expression Matching | sequence-dp | curated | dynamic-programming-general, arrays-hashing-general | String, Dynamic Programming, Recursion |
| Relative Ranks | heap | topic-fallback | arrays-hashing-general | Array, Sorting, Heap (Priority Queue) |
| Remove All Adjacent Duplicates In String | stack-general | topic-fallback | arrays-hashing-general | String, Stack |
| Remove Covered Intervals | intervals | curated | arrays-hashing-general | Array, Sorting |
| Remove Duplicates from Sorted Array | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers |
| Remove Duplicates from Sorted Array II | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers |
| Remove Duplicates from Sorted List | linked-list | topic-fallback |  | Linked List |
| Remove Element | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers |
| Remove K Digits | monotonic-stack | topic-fallback | greedy, stack-general, arrays-hashing-general | String, Stack, Greedy, Monotonic Stack |
| Remove Nth Node From End of List | linked-list | topic-fallback | two-pointers | Linked List, Two Pointers |
| Remove Outermost Parentheses | stack-general | topic-fallback | arrays-hashing-general | String, Stack, Bracket Sequences |
| Remove Stones to Minimize the Total | heap | topic-fallback | greedy, arrays-hashing-general | Array, Greedy, Heap (Priority Queue) |
| Removing Minimum and Maximum From Array | greedy | topic-fallback | arrays-hashing-general | Array, Greedy |
| Removing Stars From a String | stack-general | topic-fallback | arrays-hashing-general | String, Stack, Simulation |
| Reverse Degree of a String | arrays-hashing-general | topic-fallback |  | String, Simulation |
| Reverse Letters Then Special Characters in a String | two-pointers | topic-fallback | arrays-hashing-general | Two Pointers, String, Simulation |
| Reverse Linked List | linked-list | topic-fallback |  | Linked List, Recursion |
| Reverse String | two-pointers | topic-fallback | arrays-hashing-general | Two Pointers, String |
| Reverse Vowels of a String | two-pointers | topic-fallback | arrays-hashing-general | Two Pointers, String |
| Reverse Words in a String | two-pointers | topic-fallback | arrays-hashing-general | Two Pointers, String |
| Richest Customer Wealth | arrays-hashing-general | topic-fallback |  | Array, Matrix |
| Roman to Integer | hashing | topic-fallback | math, arrays-hashing-general | Hash Table, Math, String |
| Rotate Array | two-pointers | topic-fallback | arrays-hashing-general, math | Array, Math, Two Pointers |
| Rotate Image | arrays-hashing-general | topic-fallback | math | Array, Math, Matrix |
| Rotate List | linked-list | topic-fallback | two-pointers | Linked List, Two Pointers |
| Rotate Non Negative Elements | arrays-hashing-general | topic-fallback |  | Array, Simulation |
| Rotate String | arrays-hashing-general | topic-fallback |  | String, String Matching |
| Rotting Oranges | graph-bfs | topic-fallback | arrays-hashing-general | Array, Breadth-First Search, Matrix |
| Running Sum of 1d Array | prefix-sum | topic-fallback | arrays-hashing-general | Array, Prefix Sum |
| Same Tree | trees-general | topic-fallback | tree-dfs, tree-bfs | Tree, Depth-First Search, Breadth-First Search, Binary Tree |
| Score of a String | arrays-hashing-general | topic-fallback |  | String |
| Score of Parentheses | stack-general | topic-fallback | arrays-hashing-general | String, Stack, Bracket Sequences |
| Score Validator | arrays-hashing-general | topic-fallback |  | Array, String, Simulation |
| Search in a Binary Search Tree | bst | topic-fallback | trees-general | Tree, Binary Search Tree, Binary Tree |
| Search in Rotated Sorted Array | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Search in Rotated Sorted Array II | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Search Insert Position | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Set Mismatch | arrays-hashing-general | manual | bit-manipulation, hashing | Array, Hash Table, Bit Manipulation, Sorting |
| Shortest and Lexicographically Smallest Beautiful String | sliding-window | topic-fallback | arrays-hashing-general | String, Sliding Window |
| Shuffle the Array | arrays-hashing-general | topic-fallback |  | Array |
| Simplify Path | stack-general | topic-fallback | arrays-hashing-general | String, Stack |
| Single Element in a Sorted Array | binary-search | topic-fallback | arrays-hashing-general | Array, Binary Search |
| Single Number | arrays-hashing-general | manual | bit-manipulation | Array, Bit Manipulation |
| Smallest Divisible Digit Product I | math | topic-fallback |  | Math, Enumeration |
| Smallest Index With Digit Sum Equal to Index | arrays-hashing-general | topic-fallback | math | Array, Math |
| Smallest Missing Multiple of K | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table |
| Smallest Pair With Different Frequencies | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Counting |
| Smallest Stable Index I | prefix-sum | topic-fallback | arrays-hashing-general | Array, Prefix Sum |
| Smallest Stable Index II | prefix-sum | topic-fallback | arrays-hashing-general | Array, Prefix Sum |
| Sort an Array | heap | topic-fallback | arrays-hashing-general | Array, Divide and Conquer, Sorting, Heap (Priority Queue), Merge Sort, Bucket Sort, Radix Sort, Counting Sort |
| Sort Characters By Frequency | heap | topic-fallback | hashing, arrays-hashing-general | Hash Table, String, Sorting, Heap (Priority Queue), Bucket Sort, Counting |
| Sort Colors | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers, Sorting, Quicksort, Bubble Sort |
| Sort List | linked-list | topic-fallback | two-pointers, arrays-hashing-general | Linked List, Two Pointers, Divide and Conquer, Sorting, Merge Sort |
| Sqrt(x) | binary-search | topic-fallback | math | Math, Binary Search, Newton's Method |
| Squares of a Sorted Array | two-pointers | topic-fallback | arrays-hashing-general | Array, Two Pointers, Sorting |
| Subarray Product Less Than K | sliding-window | topic-fallback | binary-search, prefix-sum, arrays-hashing-general | Array, Binary Search, Sliding Window, Prefix Sum |
| Subarray Sum Equals K | prefix-sum | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Prefix Sum |
| Subarray Sums Divisible by K | prefix-sum | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Prefix Sum |
| Subsets | backtracking | topic-fallback | bit-manipulation, arrays-hashing-general | Array, Backtracking, Bit Manipulation |
| Subsets II | backtracking | topic-fallback | bit-manipulation, arrays-hashing-general | Array, Backtracking, Bit Manipulation |
| Subtree of Another Tree | tree-dfs | topic-fallback | hashing, trees-general, arrays-hashing-general | Tree, Depth-First Search, String Matching, Binary Tree, Hash Function |
| Sum of Compatible Numbers in Range I | bit-manipulation | manual | dynamic-programming-general | Dynamic Programming, Bit Manipulation, Enumeration |
| Sum of Decoded Numbers | arrays-hashing-general | topic-fallback | math | Array, Math, Simulation |
| Sum of Distances in Tree | tree-dfs | topic-fallback | dynamic-programming-general, trees-general, graphs-general | Dynamic Programming, Tree, Depth-First Search, Graph Theory, DP on Trees |
| Sum of GCD of Formed Pairs | two-pointers | topic-fallback | arrays-hashing-general, math | Array, Math, Two Pointers, Sorting, Simulation, Number Theory |
| Sum of Integers with Maximum Digit Range | arrays-hashing-general | topic-fallback | math | Array, Math |
| Sum of Primes Between Number and Its Reverse | math | topic-fallback |  | Math, Number Theory |
| Symmetric Tree | trees-general | topic-fallback | tree-dfs, tree-bfs | Tree, Depth-First Search, Breadth-First Search, Binary Tree |
| Take Gifts From the Richest Pile | heap | topic-fallback | arrays-hashing-general | Array, Heap (Priority Queue), Simulation |
| Target Sum | backtracking | topic-fallback | knapsack-01, dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Backtracking, Knapsack Problem, 0-1 Knapsack |
| Teemo Attacking | arrays-hashing-general | topic-fallback |  | Array, Simulation |
| To Lower Case | arrays-hashing-general | topic-fallback |  | String |
| Toggle Light Bulbs | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Sorting, Simulation |
| Top K Frequent Elements | heap | topic-fallback | hashing, arrays-hashing-general | Array, Hash Table, Divide and Conquer, Sorting, Heap (Priority Queue), Bucket Sort, Counting, Quickselect |
| Top K Frequent Words | heap | manual | trie, hashing, arrays-hashing-general | Array, Hash Table, String, Trie, Sorting, Heap (Priority Queue), Bucket Sort, Counting |
| Transform Array Using Pair Operations | arrays-hashing-general | topic-fallback |  | Array, Brainteaser |
| Trapping Rain Water | two-pointers | topic-fallback | monotonic-stack, dynamic-programming-general, stack-general, arrays-hashing-general | Array, Two Pointers, Dynamic Programming, Stack, Monotonic Stack |
| Triangle | dp-2d | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming |
| Trim Trailing Vowels | arrays-hashing-general | topic-fallback |  | String |
| Two Furthest Houses With Different Colors | greedy | topic-fallback | arrays-hashing-general | Array, Greedy |
| Two Sum | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table |
| Two Sum II - Input Array Is Sorted | two-pointers | topic-fallback | binary-search, arrays-hashing-general | Array, Two Pointers, Binary Search |
| Unique 3-Digit Even Numbers | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Recursion, Enumeration |
| Unique Middle Element | arrays-hashing-general | topic-fallback |  | Array, Counting |
| Unique Number of Occurrences | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table |
| Unique Paths | dp-2d | curated | dynamic-programming-general, math | Math, Dynamic Programming, Combinatorics |
| Unique Paths II | dp-2d | curated | dynamic-programming-general, arrays-hashing-general | Array, Dynamic Programming, Matrix |
| Valid Anagram | hashing | manual | arrays-hashing-general | Hash Table, String, Sorting |
| Valid Binary Strings With Cost Limit | backtracking | topic-fallback | bit-manipulation, arrays-hashing-general | String, Backtracking, Bit Manipulation, Enumeration |
| Valid Palindrome | two-pointers | topic-fallback | arrays-hashing-general | Two Pointers, String |
| Valid Palindrome II | two-pointers | topic-fallback | greedy, arrays-hashing-general | Two Pointers, String, Greedy |
| Valid Parentheses | stack-general | topic-fallback | arrays-hashing-general | String, Stack, Bracket Sequences |
| Valid Subarrays With Matching Sum Digits I | sliding-window | topic-fallback | prefix-sum, hashing, arrays-hashing-general | Array, Hash Table, Sliding Window, Enumeration, Prefix Sum |
| Valid Sudoku | hashing | topic-fallback | arrays-hashing-general | Array, Hash Table, Matrix |
| Validate Binary Search Tree | bst | topic-fallback | tree-dfs, trees-general | Tree, Depth-First Search, Binary Search Tree, Binary Tree |
| Validate Stack Sequences | stack-general | topic-fallback | arrays-hashing-general | Array, Stack, Simulation |
| Weighted Word Mapping | arrays-hashing-general | topic-fallback |  | Array, String, Simulation |
| Wildcard Matching | sequence-dp | curated | dynamic-programming-general, greedy, arrays-hashing-general | String, Dynamic Programming, Greedy, Recursion |
| Word Ladder | graph-bfs | topic-fallback | hashing, arrays-hashing-general | Hash Table, String, Breadth-First Search, Bidirectional Search |
| Word Search | backtracking | topic-fallback | graph-dfs, arrays-hashing-general | Array, String, Backtracking, Depth-First Search, Matrix |
