// LeetCode topic names map to our standard pattern inventory. Keep provider vocabulary here.
export const topicPatterns = {
  'Array': 'arrays-hashing', 'Hash Table': 'arrays-hashing', 'String': 'strings',
  'Two Pointers': 'two-pointers', 'Sliding Window': 'sliding-window', 'Binary Search': 'binary-search',
  'Stack': 'stack', 'Monotonic Stack': 'monotonic-stack', 'Linked List': 'linked-list',
  'Tree': 'trees', 'Binary Tree': 'trees', 'Binary Search Tree': 'trees',
  'Graph': 'graphs', 'Depth-First Search': 'graphs', 'Breadth-First Search': 'graphs',
  'Heap (Priority Queue)': 'heap', 'Backtracking': 'backtracking', 'Dynamic Programming': 'dynamic-programming',
  'Greedy': 'greedy', 'Bit Manipulation': 'bit-manipulation', 'Math': 'math', 'Sorting': 'sorting',
  'Prefix Sum': 'prefix-sum', 'Union Find': 'union-find', 'Trie': 'trie', 'Design': 'design',
  'Simulation': 'simulation', 'Counting': 'counting', 'Matrix': 'matrix', 'Queue': 'queue',
  'Monotonic Queue': 'queue', 'Recursion': 'recursion', 'Divide and Conquer': 'divide-and-conquer',
  'Topological Sort': 'graphs', 'Shortest Path': 'graphs', 'Minimum Spanning Tree': 'graphs',
  'Binary Indexed Tree': 'range-queries', 'Segment Tree': 'range-queries', 'Ordered Set': 'ordered-set',
  'Enumeration': 'enumeration', 'Number Theory': 'math', 'Combinatorics': 'math', 'Geometry': 'math',
  'Probability and Statistics': 'math', 'Game Theory': 'math', 'Bitmask': 'bit-manipulation',
  'Memoization': 'dynamic-programming', 'String Matching': 'strings', 'Rolling Hash': 'strings',
  'Hash Function': 'arrays-hashing', 'Bucket Sort': 'sorting', 'Radix Sort': 'sorting', 'Counting Sort': 'sorting',
  'Merge Sort': 'sorting', 'Quickselect': 'sorting', 'Randomized': 'randomized', 'Database': 'database',
  'Concurrency': 'concurrency', 'Iterator': 'design', 'Data Stream': 'design',
};
export function mapTopics(topics) {
  return [...new Set(topics.map(topic => topicPatterns[topic] || 'uncategorized'))].sort();
}
