-- Preserve original provider vocabulary, including unfamiliar future tags.
-- NULL distinguishes older imports from a verified empty topic list.
ALTER TABLE problems ADD COLUMN provider_topics jsonb;
ALTER TABLE problems ADD CONSTRAINT problems_provider_topics_array
  CHECK (provider_topics IS NULL OR jsonb_typeof(provider_topics) = 'array');
