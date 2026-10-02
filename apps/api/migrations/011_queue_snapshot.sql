-- Derived ranking memory only; original goals and practice remain unchanged.
ALTER TABLE workspace_goal ADD COLUMN queue_snapshot JSONB;
