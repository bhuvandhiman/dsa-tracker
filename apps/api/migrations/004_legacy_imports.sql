CREATE TABLE legacy_imports (
  installation_id UUID PRIMARY KEY,
  username TEXT NOT NULL CHECK (length(username) BETWEEN 1 AND 100),
  completed BOOLEAN NOT NULL DEFAULT false
);
