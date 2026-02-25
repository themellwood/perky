-- migrations/0004_eligibility.sql

-- User's self-reported profile attributes (one row per attribute key)
CREATE TABLE IF NOT EXISTS user_attributes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, key)
);

-- Eligibility rules attached to a benefit (one row per rule)
CREATE TABLE IF NOT EXISTS benefit_eligibility_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  benefit_id TEXT NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('gte', 'lte', 'eq', 'neq', 'contains')),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_attributes_user_id ON user_attributes(user_id);
CREATE INDEX IF NOT EXISTS idx_benefit_eligibility_rules_benefit_id ON benefit_eligibility_rules(benefit_id);
