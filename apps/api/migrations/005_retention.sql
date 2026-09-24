CREATE TABLE retention_preferences (
  target TEXT PRIMARY KEY,
  preference TEXT NOT NULL CHECK (preference IN ('normal','low','paused'))
);
CREATE TABLE problem_placements (
  problem_id INTEGER PRIMARY KEY REFERENCES problems(id) ON DELETE CASCADE,
  unit_slug TEXT NOT NULL
);
CREATE TABLE recent_imports (
  installation_id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE imported_submissions (
  username TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  problem_id INTEGER NOT NULL REFERENCES problems(id),
  submitted_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(username,submission_id)
);
CREATE INDEX imported_submissions_by_problem ON imported_submissions(problem_id,submitted_at);
