-- Perky: Union Benefits Tracker - Initial Schema

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'union_admin', 'platform_admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE unions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE collective_agreements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  union_id TEXT NOT NULL REFERENCES unions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'public_approved')),
  access_code TEXT UNIQUE,
  document_url TEXT,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE benefits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agreement_id TEXT NOT NULL REFERENCES collective_agreements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('hours', 'days', 'weeks', 'dollars', 'count')),
  limit_amount REAL,
  period TEXT NOT NULL CHECK (period IN ('per_month', 'per_year', 'per_occurrence', 'unlimited')),
  eligibility_notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE member_agreements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agreement_id TEXT NOT NULL REFERENCES collective_agreements(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, agreement_id)
);

CREATE TABLE usage_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  benefit_id TEXT NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  used_on TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE union_memberships (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  union_id TEXT NOT NULL REFERENCES unions(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, union_id)
);

CREATE INDEX idx_benefits_agreement ON benefits(agreement_id);
CREATE INDEX idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_benefit ON usage_logs(benefit_id);
CREATE INDEX idx_usage_logs_used_on ON usage_logs(used_on);
CREATE INDEX idx_member_agreements_user ON member_agreements(user_id);
CREATE INDEX idx_member_agreements_agreement ON member_agreements(agreement_id);
CREATE INDEX idx_collective_agreements_union ON collective_agreements(union_id);
CREATE INDEX idx_collective_agreements_access_code ON collective_agreements(access_code);
CREATE INDEX idx_union_memberships_user ON union_memberships(user_id);
CREATE INDEX idx_union_memberships_union ON union_memberships(union_id);
