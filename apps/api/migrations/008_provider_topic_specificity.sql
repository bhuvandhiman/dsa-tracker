-- Preserve LeetCode's specific algorithm tags instead of collapsing them into
-- broad Tree/Graph/Range Query metadata. Existing stored tags remain valid;
-- reimports and new captures can add the more specific provider evidence.
INSERT INTO patterns (slug,name) VALUES
  ('depth-first-search','Depth-first search'),
  ('breadth-first-search','Breadth-first search'),
  ('binary-search-tree','Binary search tree'),
  ('segment-tree','Segment tree'),
  ('binary-indexed-tree','Binary indexed tree'),
  ('topological-sort','Topological sort'),
  ('shortest-path','Shortest path'),
  ('minimum-spanning-tree','Minimum spanning tree')
ON CONFLICT (slug) DO NOTHING;
