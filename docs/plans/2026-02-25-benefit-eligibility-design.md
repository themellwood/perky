# Benefit Eligibility Design

**Date:** 2026-02-25
**Status:** Approved

## Overview

Some benefits in collective agreements only apply to certain employees — e.g. those with 6+ months tenure, permanent staff only, or managers only. This design adds an eligibility system that informs users which benefits may or may not apply to them, based on their self-reported profile.

## Decisions

| Question | Decision |
|---|---|
| Enforcement mode | Informational only — badges/warnings, user can still log usage |
| Profile source | Self-reported by the user |
| Criteria supported | Tenure (via start date), employment type, job title — extensible to others |
| Rule source | AI extracts a first pass from the PDF; admin reviews and adjusts |
| Data model | EAV tables (maximum flexibility, no migration needed for new attribute types) |

---

## Section 1: Data Model

### Two new tables

```sql
-- User's self-reported attributes (one row per attribute key)
CREATE TABLE user_attributes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,      -- e.g. "start_date", "employment_type", "job_title"
  value TEXT NOT NULL,    -- always stored as text
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, key)
);

-- Eligibility rules attached to a benefit (one row per rule)
CREATE TABLE benefit_eligibility_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  benefit_id TEXT NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  key TEXT NOT NULL,       -- e.g. "tenure_months", "employment_type", "job_title"
  operator TEXT NOT NULL,  -- "gte", "lte", "eq", "neq", "contains"
  value TEXT NOT NULL,     -- e.g. "6", "permanent", "manager"
  label TEXT NOT NULL,     -- human-readable: "6+ months tenure required"
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Well-known attribute keys

| Key | Stored as | Notes |
|---|---|---|
| `start_date` | ISO date string `YYYY-MM-DD` | System derives `tenure_months` at evaluation time |
| `employment_type` | One of: `full_time`, `part_time`, `casual`, `permanent`, `fixed_term` | |
| `job_title` | Free text | |

New attribute types (e.g. `nationality`) can be added by storing a new key — no migration required.

### Supported operators

| Operator | Meaning |
|---|---|
| `gte` | Greater than or equal (numeric) |
| `lte` | Less than or equal (numeric) |
| `eq` | Exactly equal (string) |
| `neq` | Not equal (string) |
| `contains` | Text contains substring (case-insensitive) |

---

## Section 2: Eligibility Evaluation Logic

Evaluation runs in TypeScript on the API inside `getUsageSummary`, and results flow through to the frontend.

### Algorithm

For each benefit in the user's summary:
1. Load the benefit's `benefit_eligibility_rules` rows
2. Load the user's `user_attributes` rows (keyed by `key`)
3. For `start_date` rules: compute `tenure_months = months between start_date and today`, then apply `gte`/`lte` against the rule value
4. For all other keys: compare the user's stored value directly using the operator
5. If the user **has not set** an attribute required by a rule → treat as **unknown**

### Result per benefit

Two new fields added to each entry in the usage summary response:

```ts
eligible: true | false | 'unknown'
// true    = all rules pass (or no rules configured)
// false   = at least one rule explicitly fails
// unknown = no explicit failures but ≥1 required attribute is missing

unmet_rules: string[]
// Labels of all failing or unknown rules
// e.g. ["6+ months tenure required", "Permanent employees only"]
```

---

## Section 3: User Profile UI

### Route: `/profile` (protected)

A new page accessible from the nav/user menu with a single "My Details" form:

| Field | Input type | Attribute key |
|---|---|---|
| Start date | Date picker | `start_date` |
| Employment type | Select: Full-time / Part-time / Casual / Permanent / Fixed-term | `employment_type` |
| Job title | Text input | `job_title` |

- All fields are optional — users fill in what they know
- Save upserts into `user_attributes` (insert or replace by `user_id + key`)
- Existing values are pre-filled on load

### API endpoints

```
GET  /api/profile/attributes        → returns user's attribute key/value pairs
PUT  /api/profile/attributes        → upserts a batch of attributes
```

### Profile completeness banner (Dashboard)

If any of the user's benefits have `eligible: 'unknown'`, show a single banner at the top of the dashboard:

> ⚠️ "Some benefits have eligibility requirements. **Complete your profile →** to see which apply to you."

Disappears once all referenced attributes are filled in.

---

## Section 4: Admin Benefit Rules UI & AI Extraction

### AI extraction

The extraction prompt gains a new optional field per benefit:

```json
"eligibility_rules": [
  { "key": "tenure_months", "operator": "gte", "value": "6", "label": "6+ months tenure required" },
  { "key": "employment_type", "operator": "eq", "value": "permanent", "label": "Permanent employees only" }
]
```

Claude extracts these from the `eligibility_notes` text found in the PDF. Rules are passed through the review UI pre-filled so the admin can confirm or remove them before accepting.

### `BenefitCard` edit mode — Eligibility Rules section

A new collapsible "Eligibility Rules" section at the bottom of the edit form:

- Lists current rules, each showing its `label` with a remove (×) button
- "Add rule" row with:
  - Key dropdown: Start date / Employment type / Job title / Custom…
  - Operator dropdown (options vary by key: e.g. "is at least" / "is at most" for tenure, "is exactly" / "is not" for employment type, "contains" / "is exactly" for job title)
  - Value field (number input for tenure, select for employment type, text for job title/custom)
  - Auto-generated label (editable)
- Rules are saved/deleted immediately via API on add/remove (no separate save step)

### New API endpoints

```
GET    /api/benefits/:id/eligibility-rules           → list rules for a benefit
POST   /api/benefits/:id/eligibility-rules           → add a rule
DELETE /api/benefits/:id/eligibility-rules/:ruleId   → remove a rule
```

---

## Section 5: Dashboard & Detail Page UI Changes

### `BenefitDashboardCard` — eligibility badge

Shown below the benefit name when `eligible !== true` and rules exist:

| State | Badge | Behaviour |
|---|---|---|
| `eligible: false` | 🟡 Amber — "May not apply to you" | Tooltip lists failing rule labels |
| `eligible: 'unknown'` | ⚪ Grey — "Complete profile to check eligibility" | Links to `/profile` |
| `eligible: true` or no rules | No badge | Normal display |

Usage logging is never blocked — all states allow "Log Usage".

### `BenefitDetailPage` — Eligibility section

A new "Eligibility" section appears when the benefit has rules:

- Each rule shown as a row: status icon + label
  - ✅ green — rule passes
  - ❌ red — rule fails
  - ❓ grey — attribute not set
- If any attributes missing: "Update your profile →" link to `/profile`

---

## Files to Change

| File | Change |
|---|---|
| `migrations/0004_eligibility.sql` | New `user_attributes` and `benefit_eligibility_rules` tables |
| `packages/api/src/services/eligibility.ts` | New service: evaluate rules, CRUD for both tables |
| `packages/api/src/routes/profile.ts` | New route: `GET/PUT /api/profile/attributes` |
| `packages/api/src/routes/benefits.ts` | Add eligibility rule endpoints under `/:id/eligibility-rules` |
| `packages/api/src/services/usage.ts` | `getUsageSummary` — load rules + user attributes, add `eligible` + `unmet_rules` to each entry |
| `packages/api/src/services/extraction.ts` | Add `eligibility_rules` to extraction prompt |
| `packages/api/src/routes/documents.ts` | Pass `eligibility_rules` through accept endpoint to service |
| `packages/api/src/routes/self-service.ts` | Same as above |
| `packages/api/src/index.ts` | Register new profile route |
| `packages/web/src/hooks/useProfile.ts` | New hook: fetch/save user attributes |
| `packages/web/src/hooks/useBenefitRules.ts` | New hook: list/add/delete eligibility rules |
| `packages/web/src/hooks/useUsage.ts` | Add `eligible` + `unmet_rules` to `UsageSummary` type |
| `packages/web/src/pages/ProfilePage.tsx` | New page: user profile form |
| `packages/web/src/components/BenefitDashboardCard.tsx` | Add eligibility badge |
| `packages/web/src/pages/BenefitDetailPage.tsx` | Add Eligibility section |
| `packages/web/src/components/BenefitCard.tsx` | Add eligibility rules editor in edit mode |
| `packages/web/src/pages/DashboardPage.tsx` | Add profile completeness banner |
| `packages/web/src/App.tsx` | Register `/profile` route |
