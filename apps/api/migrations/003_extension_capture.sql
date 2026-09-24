ALTER TABLE attempts ADD COLUMN pattern_source text NOT NULL DEFAULT 'explicit'
  CHECK (pattern_source IN ('explicit', 'inferred'));
INSERT INTO patterns (slug,name) VALUES
 ('strings','Strings'),('math','Math'),('sorting','Sorting'),('prefix-sum','Prefix sum'),
 ('union-find','Union find'),('trie','Trie'),('design','Design'),('simulation','Simulation'),
 ('counting','Counting'),('matrix','Matrix'),('queue','Queue'),('recursion','Recursion'),
 ('divide-and-conquer','Divide and conquer'),('range-queries','Range queries'),
 ('ordered-set','Ordered set'),('enumeration','Enumeration'),('randomized','Randomized'),
 ('database','Database'),('concurrency','Concurrency'),('uncategorized','Uncategorized');
