-- Preserve LeetCode's Hash Table / Hash Function evidence separately from the
-- broad Array family so Recall can place those problems under Hash maps & sets.
INSERT INTO patterns (slug,name) VALUES
  ('hash-table','Hash table')
ON CONFLICT (slug) DO NOTHING;
