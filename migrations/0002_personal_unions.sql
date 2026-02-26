-- Add type column to unions for distinguishing personal vs standard unions
ALTER TABLE unions ADD COLUMN type TEXT NOT NULL DEFAULT 'standard';

-- Index for filtering personal unions
CREATE INDEX idx_unions_type ON unions(type);
