CREATE TABLE patterns (
  slug TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name TEXT NOT NULL UNIQUE CHECK (length(name) BETWEEN 1 AND 100)
);

CREATE TABLE problems (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  url TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (platform, external_id)
);

-- Possible approaches belong to a problem; practiced approaches belong to an attempt.
CREATE TABLE problem_patterns (
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  pattern_slug TEXT NOT NULL REFERENCES patterns(slug),
  PRIMARY KEY (problem_id, pattern_slug)
);
CREATE INDEX problem_patterns_by_pattern ON problem_patterns(pattern_slug, problem_id);

CREATE TABLE attempts (
  id UUID PRIMARY KEY,
  problem_id INTEGER NOT NULL REFERENCES problems(id),
  assistance TEXT NOT NULL CHECK (assistance IN ('independent', 'hint', 'solution')),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 5000),
  attempted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_hash TEXT NOT NULL CHECK (length(request_hash) = 64)
);
CREATE INDEX attempts_by_time ON attempts(attempted_at DESC, id DESC);
CREATE INDEX attempts_by_problem ON attempts(problem_id);

CREATE TABLE attempt_patterns (
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  pattern_slug TEXT NOT NULL REFERENCES patterns(slug),
  PRIMARY KEY (attempt_id, pattern_slug)
);
CREATE INDEX attempt_patterns_by_pattern ON attempt_patterns(pattern_slug, attempt_id);

-- Historical evidence is not an attempt: assistance, notes and approaches are unknown.
CREATE TABLE historical_solves (
  problem_id INTEGER PRIMARY KEY REFERENCES problems(id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO patterns (slug, name) VALUES
  ('arrays-hashing', 'Arrays and hashing'),
  ('two-pointers', 'Two pointers'),
  ('sliding-window', 'Sliding window'),
  ('binary-search', 'Binary search'),
  ('stack', 'Stack'),
  ('monotonic-stack', 'Monotonic stack'),
  ('linked-list', 'Linked list'),
  ('trees', 'Trees'),
  ('graphs', 'Graphs'),
  ('heap', 'Heap / priority queue'),
  ('backtracking', 'Backtracking'),
  ('dynamic-programming', 'Dynamic programming'),
  ('greedy', 'Greedy'),
  ('intervals', 'Intervals'),
  ('bit-manipulation', 'Bit manipulation');
