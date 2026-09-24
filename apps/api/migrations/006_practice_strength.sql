ALTER TABLE attempts ADD COLUMN practice_unit TEXT;
ALTER TABLE attempts ADD COLUMN approach_source TEXT NOT NULL DEFAULT 'inferred' CHECK (approach_source IN ('inferred','confirmed'));
ALTER TABLE attempts ADD COLUMN capture_source TEXT NOT NULL DEFAULT 'manual' CHECK (capture_source IN ('manual','accepted'));
ALTER TABLE attempts ADD COLUMN submission_id TEXT;
ALTER TABLE attempts ADD COLUMN selected_topics JSONB NOT NULL DEFAULT '[]';
CREATE INDEX attempts_by_practice_unit ON attempts(practice_unit) WHERE deleted_at IS NULL;
UPDATE problem_placements SET unit_slug='graphs-general' WHERE unit_slug='advanced-graphs-general';
-- Existing installation UUID columns now identify individual resumable import runs.
CREATE TABLE workspace_account (singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK(singleton), username TEXT NOT NULL);
INSERT INTO workspace_account(username) SELECT username FROM legacy_imports ORDER BY completed DESC LIMIT 1;
