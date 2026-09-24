ALTER TABLE attempts ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE attempts ADD COLUMN deleted_at timestamptz;
