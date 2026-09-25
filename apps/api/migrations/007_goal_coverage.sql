CREATE TABLE workspace_goal (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  profile TEXT NOT NULL CHECK (profile IN ('interview','deep')),
  target INTEGER NOT NULL CHECK (target IN (300,500,1000)),
  policy_version TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

