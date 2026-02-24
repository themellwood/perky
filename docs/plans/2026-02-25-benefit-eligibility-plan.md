# Benefit Eligibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an EAV-based eligibility system that shows informational warnings on benefit cards when a user's self-reported profile doesn't meet a benefit's requirements.

**Architecture:** Two new D1 tables (`user_attributes`, `benefit_eligibility_rules`) using EAV. Eligibility is evaluated in TypeScript in `getUsageSummary`, which adds `eligible` + `unmet_rules` fields to each summary entry. The AI extractor picks up rules from PDFs; admins review via a rules editor in BenefitCard. Users fill in their profile at `/profile`. Warnings appear as non-blocking badges on the dashboard and detail page.

**Tech Stack:** Hono + Cloudflare D1/Workers (API), React + TanStack Query + Tailwind (frontend), Zod validation, Vite build. No test framework — verify with `tsc --noEmit` (api) and `vite build` (web). Brutalist design classes: `card-brutal`, `btn-primary`, `badge-brutal`, `border-3 border-ink`, `shadow-brutal`.

**Design doc:** `docs/plans/2026-02-25-benefit-eligibility-design.md`

---

### Task 1: DB Migration

**Files:**
- Create: `migrations/0004_eligibility.sql`

**Step 1: Create the migration file**

```sql
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
```

**Step 2: Apply the migration locally**

```bash
cd /path/to/project
npx wrangler d1 execute perky-db --local --file=migrations/0004_eligibility.sql
```
Expected: no errors

**Step 3: Commit**

```bash
git add migrations/0004_eligibility.sql
git commit -m "feat: add user_attributes and benefit_eligibility_rules migration"
```

---

### Task 2: Eligibility Service

**Files:**
- Create: `packages/api/src/services/eligibility.ts`

**Step 1: Write the service**

```typescript
// packages/api/src/services/eligibility.ts

export type Operator = 'gte' | 'lte' | 'eq' | 'neq' | 'contains';

export interface EligibilityRule {
  id: string;
  benefit_id: string;
  key: string;
  operator: Operator;
  value: string;
  label: string;
  updated_at: string;
}

export interface UserAttribute {
  id: string;
  user_id: string;
  key: string;
  value: string;
  updated_at: string;
}

export type EligibilityStatus = true | false | 'unknown';

export interface EligibilityResult {
  eligible: EligibilityStatus;
  unmet_rules: string[];
}

// ── User Attributes ──────────────────────────────────────────────────────────

export async function getUserAttributes(db: D1Database, userId: string): Promise<Record<string, string>> {
  const result = await db.prepare(
    'SELECT key, value FROM user_attributes WHERE user_id = ?'
  ).bind(userId).all<{ key: string; value: string }>();
  const attrs: Record<string, string> = {};
  for (const row of result.results) {
    attrs[row.key] = row.value;
  }
  return attrs;
}

export async function upsertUserAttributes(
  db: D1Database,
  userId: string,
  attrs: Record<string, string>
): Promise<void> {
  for (const [key, value] of Object.entries(attrs)) {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    await db.prepare(`
      INSERT INTO user_attributes (id, user_id, key, value)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).bind(id, userId, key, value).run();
  }
}

// ── Benefit Eligibility Rules ────────────────────────────────────────────────

export async function getRulesForBenefit(db: D1Database, benefitId: string): Promise<EligibilityRule[]> {
  const result = await db.prepare(
    'SELECT * FROM benefit_eligibility_rules WHERE benefit_id = ? ORDER BY updated_at ASC'
  ).bind(benefitId).all<EligibilityRule>();
  return result.results;
}

export async function getRulesForBenefits(db: D1Database, benefitIds: string[]): Promise<Map<string, EligibilityRule[]>> {
  if (benefitIds.length === 0) return new Map();
  const placeholders = benefitIds.map(() => '?').join(',');
  const result = await db.prepare(
    `SELECT * FROM benefit_eligibility_rules WHERE benefit_id IN (${placeholders}) ORDER BY updated_at ASC`
  ).bind(...benefitIds).all<EligibilityRule>();
  const map = new Map<string, EligibilityRule[]>();
  for (const row of result.results) {
    if (!map.has(row.benefit_id)) map.set(row.benefit_id, []);
    map.get(row.benefit_id)!.push(row);
  }
  return map;
}

export async function addEligibilityRule(
  db: D1Database,
  benefitId: string,
  rule: { key: string; operator: Operator; value: string; label: string }
): Promise<EligibilityRule> {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  await db.prepare(`
    INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, benefitId, rule.key, rule.operator, rule.value, rule.label).run();
  return db.prepare(
    'SELECT * FROM benefit_eligibility_rules WHERE id = ?'
  ).bind(id).first<EligibilityRule>() as Promise<EligibilityRule>;
}

export async function deleteEligibilityRule(db: D1Database, ruleId: string): Promise<void> {
  await db.prepare('DELETE FROM benefit_eligibility_rules WHERE id = ?').bind(ruleId).run();
}

// ── Evaluation ───────────────────────────────────────────────────────────────

/** Compute tenure in complete months from a YYYY-MM-DD start date to today. */
function tenureMonths(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

/** Evaluate a single rule against the user's attributes. Returns true/false/'unknown'. */
function evaluateRule(rule: EligibilityRule, attrs: Record<string, string>): true | false | 'unknown' {
  // Special case: tenure_months is derived from start_date
  if (rule.key === 'tenure_months') {
    if (!attrs['start_date']) return 'unknown';
    const actual = tenureMonths(attrs['start_date']);
    const required = parseFloat(rule.value);
    if (isNaN(required)) return 'unknown';
    if (rule.operator === 'gte') return actual >= required;
    if (rule.operator === 'lte') return actual <= required;
    return 'unknown';
  }

  const userValue = attrs[rule.key];
  if (userValue === undefined || userValue === null || userValue === '') return 'unknown';

  const ruleVal = rule.value.toLowerCase();
  const userVal = userValue.toLowerCase();

  switch (rule.operator) {
    case 'eq':       return userVal === ruleVal;
    case 'neq':      return userVal !== ruleVal;
    case 'contains': return userVal.includes(ruleVal);
    case 'gte': {
      const a = parseFloat(userVal), b = parseFloat(ruleVal);
      return isNaN(a) || isNaN(b) ? 'unknown' : a >= b;
    }
    case 'lte': {
      const a = parseFloat(userVal), b = parseFloat(ruleVal);
      return isNaN(a) || isNaN(b) ? 'unknown' : a <= b;
    }
    default: return 'unknown';
  }
}

/** Evaluate all rules for a benefit. Returns eligible status + labels of failing/unknown rules. */
export function evaluateEligibility(rules: EligibilityRule[], attrs: Record<string, string>): EligibilityResult {
  if (rules.length === 0) return { eligible: true, unmet_rules: [] };

  let anyFail = false;
  let anyUnknown = false;
  const unmet_rules: string[] = [];

  for (const rule of rules) {
    const result = evaluateRule(rule, attrs);
    if (result === false) {
      anyFail = true;
      unmet_rules.push(rule.label);
    } else if (result === 'unknown') {
      anyUnknown = true;
      unmet_rules.push(rule.label);
    }
  }

  const eligible: EligibilityStatus = anyFail ? false : anyUnknown ? 'unknown' : true;
  return { eligible, unmet_rules };
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit 2>&1 | grep "eligibility"
```
Expected: no errors mentioning eligibility.ts

**Step 3: Commit**

```bash
git add packages/api/src/services/eligibility.ts
git commit -m "feat: add eligibility service (EAV CRUD + rule evaluation)"
```

---

### Task 3: Profile API Route

**Files:**
- Create: `packages/api/src/routes/profile.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: Create the profile route**

```typescript
// packages/api/src/routes/profile.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { getUserAttributes, upsertUserAttributes } from '../services/eligibility';

const profile = new Hono<AppEnv>();

profile.use('*', requireAuth);

// Get current user's attributes
profile.get('/attributes', async (c) => {
  const user = c.get('user')!;
  const attrs = await getUserAttributes(c.env.DB, user.id);
  return c.json({ data: attrs });
});

// Upsert user attributes
profile.put('/attributes',
  zValidator('json', z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    employment_type: z.enum(['full_time', 'part_time', 'casual', 'permanent', 'fixed_term']).optional(),
    job_title: z.string().max(200).optional(),
  }).passthrough()), // passthrough allows unknown keys for future extensibility
  async (c) => {
    const user = c.get('user')!;
    const body = c.req.valid('json');
    // Filter out undefined values
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null) attrs[k] = String(v);
    }
    await upsertUserAttributes(c.env.DB, user.id, attrs);
    const updated = await getUserAttributes(c.env.DB, user.id);
    return c.json({ data: updated });
  }
);

export default profile;
```

**Step 2: Register the route in `packages/api/src/index.ts`**

Add the import near the top with the other route imports:
```typescript
import profile from './routes/profile';
```

Add the route registration after the other `api.route()` calls:
```typescript
api.route('/profile', profile);
```

**Step 3: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit 2>&1 | grep -E "profile|error" | head -20
```
Expected: Only the known pre-existing Zod version mismatch errors, nothing new.

**Step 4: Commit**

```bash
git add packages/api/src/routes/profile.ts packages/api/src/index.ts
git commit -m "feat: add /api/profile/attributes GET and PUT endpoints"
```

---

### Task 4: Benefit Eligibility Rules API

**Files:**
- Modify: `packages/api/src/routes/benefits.ts`

**Step 1: Add imports and new endpoints to `benefits.ts`**

Add to the import at the top:
```typescript
import {
  getRulesForBenefit, addEligibilityRule, deleteEligibilityRule,
  type Operator
} from '../services/eligibility';
```

Add the Zod schema for a new rule (after the existing `benefitSchema`):
```typescript
const eligibilityRuleSchema = z.object({
  key: z.string().min(1).max(100),
  operator: z.enum(['gte', 'lte', 'eq', 'neq', 'contains']),
  value: z.string().min(1).max(200),
  label: z.string().min(1).max(300),
});
```

Add three new endpoints at the bottom, before `export default benefits;`:

```typescript
// List eligibility rules for a benefit (admin or member with access)
benefits.get('/:id/eligibility-rules', async (c) => {
  const user = c.get('user')!;
  const benefit = await userCanReadBenefit(c.env.DB, c.req.param('id'), user);
  if (!benefit) return c.json({ error: 'Benefit not found' }, 404);
  const rules = await getRulesForBenefit(c.env.DB, c.req.param('id'));
  return c.json({ data: rules });
});

// Add an eligibility rule (union admin only)
benefits.post('/:id/eligibility-rules',
  zValidator('json', eligibilityRuleSchema),
  async (c) => {
    const user = c.get('user')!;
    const benefit = await userCanWriteBenefit(c.env.DB, c.req.param('id'), user);
    if (!benefit) return c.json({ error: 'Benefit not found' }, 404);
    const data = c.req.valid('json');
    const rule = await addEligibilityRule(c.env.DB, c.req.param('id'), {
      ...data,
      operator: data.operator as Operator,
    });
    return c.json({ data: rule }, 201);
  }
);

// Delete an eligibility rule (union admin only)
benefits.delete('/:id/eligibility-rules/:ruleId', async (c) => {
  const user = c.get('user')!;
  const benefit = await userCanWriteBenefit(c.env.DB, c.req.param('id'), user);
  if (!benefit) return c.json({ error: 'Benefit not found' }, 404);
  await deleteEligibilityRule(c.env.DB, c.req.param('ruleId'));
  return c.json({ success: true });
});
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit 2>&1 | grep -v "ZodError\|_def.errorMap\|ZodIssue\|ZodInvalid" | grep error | head -10
```
Expected: no new errors

**Step 3: Commit**

```bash
git add packages/api/src/routes/benefits.ts
git commit -m "feat: add eligibility rules CRUD endpoints on benefits"
```

---

### Task 5: Update Usage Service

Wire eligibility evaluation into `getUsageSummary` so every summary entry includes `eligible` and `unmet_rules`.

**Files:**
- Modify: `packages/api/src/services/usage.ts`

**Step 1: Read the current `getUsageSummary` function** to understand what it returns and how it queries.

**Step 2: Add the eligibility import**

At the top of `packages/api/src/services/usage.ts`, add:
```typescript
import { getRulesForBenefits, getUserAttributes, evaluateEligibility, type EligibilityStatus } from './eligibility';
```

**Step 3: Update the `UsageSummary` interface** to include the new fields:
```typescript
export interface UsageSummary {
  // ... existing fields ...
  eligible: EligibilityStatus;
  unmet_rules: string[];
}
```

**Step 4: Update `getUsageSummary`** — after building the summaries array, load rules and user attributes, then annotate each entry.

At the end of `getUsageSummary`, before the `return` statement, add:

```typescript
// Load eligibility data
const benefitIds = summaries.map((s: any) => s.benefit_id);
const rulesMap = await getRulesForBenefits(db, benefitIds);
const userAttrs = await getUserAttributes(db, userId);

// Annotate each summary with eligibility result
return summaries.map((s: any) => {
  const rules = rulesMap.get(s.benefit_id) ?? [];
  const { eligible, unmet_rules } = evaluateEligibility(rules, userAttrs);
  return { ...s, eligible, unmet_rules };
});
```

(Remove the old bare `return summaries` or `return result.results` and replace with the above.)

**Step 5: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit 2>&1 | grep -v "ZodError\|_def.errorMap\|ZodIssue\|ZodInvalid" | grep error | head -10
```
Expected: no new errors

**Step 6: Commit**

```bash
git add packages/api/src/services/usage.ts
git commit -m "feat: add eligible + unmet_rules to usage summary via eligibility evaluation"
```

---

### Task 6: Update AI Extraction — Add Eligibility Rules

**Files:**
- Modify: `packages/api/src/services/extraction.ts`

**Step 1: Update `EXTRACTION_PROMPT`**

In the "For EACH benefit, provide ALL of these fields:" section, add after `clause_reference`:

```
- eligibility_rules: Array of structured eligibility requirements. For each requirement found, provide:
  - key: One of "tenure_months" (for time-in-role requirements), "employment_type" (full_time/part_time/casual/permanent/fixed_term), "job_title" (for title/classification requirements), or a descriptive snake_case key for anything else
  - operator: "gte" (at least), "lte" (at most), "eq" (exactly), "neq" (not), "contains" (includes)
  - value: The threshold value as a string (e.g. "6" for 6 months, "permanent" for permanent employment)
  - label: Human-readable label (e.g. "6+ months tenure required", "Permanent employees only")
  If there are no eligibility restrictions, use an empty array [].
```

Update the JSON example in the prompt to include:
```json
"eligibility_rules": [
  { "key": "tenure_months", "operator": "gte", "value": "6", "label": "6+ months tenure required" }
]
```

**Step 2: Update the `ExtractedBenefit` interface**

Add to the interface:
```typescript
eligibility_rules: Array<{
  key: string;
  operator: string;
  value: string;
  label: string;
}> | null;
```

**Step 3: Update the benefit mapping** in `extractBenefitsFromPdf`

In the `.map((b: any) => ({ ... }))` block, add:
```typescript
eligibility_rules: Array.isArray(b.eligibility_rules)
  ? b.eligibility_rules
      .filter((r: any) => r.key && r.operator && r.value && r.label)
      .map((r: any) => ({
        key: String(r.key).slice(0, 100),
        operator: String(r.operator).slice(0, 20),
        value: String(r.value).slice(0, 200),
        label: String(r.label).slice(0, 300),
      }))
  : null,
```

**Step 4: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit 2>&1 | grep -v "ZodError\|_def.errorMap\|ZodIssue\|ZodInvalid" | grep error | head -10
```

**Step 5: Commit**

```bash
git add packages/api/src/services/extraction.ts
git commit -m "feat: extract eligibility_rules from PDF in AI extraction"
```

---

### Task 7: Pass Eligibility Rules Through Accept Endpoints

When an admin accepts extracted benefits, persist the extracted `eligibility_rules` into `benefit_eligibility_rules`.

**Files:**
- Modify: `packages/api/src/routes/documents.ts`
- Modify: `packages/api/src/routes/self-service.ts`

**Step 1: Update `documents.ts` accept endpoint**

Add to the import at the top:
```typescript
import { addEligibilityRule, type Operator } from '../services/eligibility';
```

In the `acceptBenefitsSchema`, add to the benefit object schema:
```typescript
eligibility_rules: z.array(z.object({
  key: z.string().min(1).max(100),
  operator: z.string().min(1).max(20),
  value: z.string().min(1).max(200),
  label: z.string().min(1).max(300),
})).optional(),
```

After `created.push(benefit)` in the for loop, add:
```typescript
// Save extracted eligibility rules if any
if (b.eligibility_rules?.length && benefit) {
  const validOps = ['gte', 'lte', 'eq', 'neq', 'contains'];
  for (const rule of b.eligibility_rules) {
    if (validOps.includes(rule.operator)) {
      await addEligibilityRule(c.env.DB, (benefit as any).id, {
        key: rule.key,
        operator: rule.operator as Operator,
        value: rule.value,
        label: rule.label,
      });
    }
  }
}
```

**Step 2: Apply the same changes to `self-service.ts`**

Same import addition and same block after `created.push(benefit)` in the `/accept/:agreementId` handler.

**Step 3: Verify TypeScript compiles and Vite builds**

```bash
cd packages/api && npx tsc --noEmit 2>&1 | grep -v "ZodError\|_def.errorMap\|ZodIssue\|ZodInvalid" | grep error | head -10
```

**Step 4: Commit**

```bash
git add packages/api/src/routes/documents.ts packages/api/src/routes/self-service.ts
git commit -m "feat: persist extracted eligibility_rules when accepting benefits"
```

---

### Task 8: Frontend Types — Update useUsage and Add useProfile + useBenefitRules

**Files:**
- Modify: `packages/web/src/hooks/useUsage.ts`
- Create: `packages/web/src/hooks/useProfile.ts`
- Create: `packages/web/src/hooks/useBenefitRules.ts`

**Step 1: Update `useUsage.ts`** — add the two new fields to `UsageSummary`

Find the `UsageSummary` interface and add:
```typescript
eligible: true | false | 'unknown';
unmet_rules: string[];
```

**Step 2: Create `useProfile.ts`**

```typescript
// packages/web/src/hooks/useProfile.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface UserAttributes {
  start_date?: string;
  employment_type?: 'full_time' | 'part_time' | 'casual' | 'permanent' | 'fixed_term';
  job_title?: string;
  [key: string]: string | undefined;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'attributes'],
    queryFn: () =>
      api.get<{ data: UserAttributes }>('/profile/attributes').then((r) => r.data),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attrs: UserAttributes) =>
      api.put<{ data: UserAttributes }>('/profile/attributes', attrs).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', 'attributes'] });
      qc.invalidateQueries({ queryKey: ['usage', 'summary'] });
    },
  });
}
```

**Step 3: Create `useBenefitRules.ts`**

```typescript
// packages/web/src/hooks/useBenefitRules.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface EligibilityRule {
  id: string;
  benefit_id: string;
  key: string;
  operator: 'gte' | 'lte' | 'eq' | 'neq' | 'contains';
  value: string;
  label: string;
  updated_at: string;
}

export function useBenefitRules(benefitId: string | null) {
  return useQuery({
    queryKey: ['benefit-rules', benefitId],
    queryFn: () =>
      api.get<{ data: EligibilityRule[] }>(`/benefits/${benefitId}/eligibility-rules`).then((r) => r.data),
    enabled: !!benefitId,
  });
}

export function useAddBenefitRule(benefitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: Omit<EligibilityRule, 'id' | 'benefit_id' | 'updated_at'>) =>
      api.post<{ data: EligibilityRule }>(`/benefits/${benefitId}/eligibility-rules`, rule).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['benefit-rules', benefitId] });
      qc.invalidateQueries({ queryKey: ['usage', 'summary'] });
    },
  });
}

export function useDeleteBenefitRule(benefitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      api.delete(`/benefits/${benefitId}/eligibility-rules/${ruleId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['benefit-rules', benefitId] });
      qc.invalidateQueries({ queryKey: ['usage', 'summary'] });
    },
  });
}
```

**Step 4: Verify Vite build passes**

```bash
cd packages/web && npx vite build 2>&1 | tail -10
```
Expected: `✓ built in X.XXs`

**Step 5: Commit**

```bash
git add packages/web/src/hooks/useUsage.ts packages/web/src/hooks/useProfile.ts packages/web/src/hooks/useBenefitRules.ts
git commit -m "feat: add useProfile and useBenefitRules hooks; add eligible/unmet_rules to UsageSummary"
```

---

### Task 9: Profile Page

**Files:**
- Create: `packages/web/src/pages/ProfilePage.tsx`
- Modify: `packages/web/src/App.tsx`

**Step 1: Create `ProfilePage.tsx`**

```tsx
// packages/web/src/pages/ProfilePage.tsx
import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import type { UserAttributes } from '../hooks/useProfile';
import { useAuth } from '../lib/auth';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  casual: 'Casual',
  permanent: 'Permanent',
  fixed_term: 'Fixed-term',
};

export function ProfilePage() {
  const { user } = useAuth();
  const { data: attrs, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [startDate, setStartDate] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (attrs) {
      setStartDate(attrs.start_date ?? '');
      setEmploymentType(attrs.employment_type ?? '');
      setJobTitle(attrs.job_title ?? '');
    }
  }, [attrs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updates: UserAttributes = {};
    if (startDate) updates.start_date = startDate;
    if (employmentType) updates.employment_type = employmentType as UserAttributes['employment_type'];
    if (jobTitle) updates.job_title = jobTitle;
    await updateProfile.mutateAsync(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto p-6">
          <div className="animate-pulse h-8 bg-gray-200 rounded w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="animate-pulse h-12 bg-gray-200 rounded" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-ink mb-2">My Profile</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Your details are used to check which benefits apply to you. All fields are optional.
        </p>

        <form onSubmit={handleSave} className="card-brutal p-6 space-y-5">
          {/* Account info (read-only) */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">Email</label>
            <p className="text-gray-600 text-sm">{user?.email}</p>
          </div>

          <hr className="border-ink/20" />

          {/* Start date */}
          <div>
            <label htmlFor="start_date" className="block text-sm font-semibold text-ink mb-1">
              Employment start date
            </label>
            <p className="text-xs text-gray-500 mb-2">Used to calculate your tenure for eligibility checks.</p>
            <input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-brutal w-full"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Employment type */}
          <div>
            <label htmlFor="employment_type" className="block text-sm font-semibold text-ink mb-1">
              Employment type
            </label>
            <select
              id="employment_type"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="input-brutal w-full"
            >
              <option value="">— Select —</option>
              {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Job title */}
          <div>
            <label htmlFor="job_title" className="block text-sm font-semibold text-ink mb-1">
              Job title / classification
            </label>
            <input
              id="job_title"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Nurse, Grade 3 Technician"
              className="input-brutal w-full"
              maxLength={200}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="btn-primary"
            >
              {updateProfile.isPending ? 'Saving…' : 'Save profile'}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">✓ Saved</span>
            )}
            {updateProfile.isError && (
              <span className="text-sm text-red-600">Failed to save. Try again.</span>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
}
```

**Step 2: Register the route in `App.tsx`**

Add the import:
```typescript
import { ProfilePage } from './pages/ProfilePage';
```

Inside the protected routes section (wherever other protected routes like `/dashboard` live), add:
```tsx
<Route path="/profile" element={<ProfilePage />} />
```

**Step 3: Verify Vite build passes**

```bash
cd packages/web && npx vite build 2>&1 | tail -10
```
Expected: `✓ built in X.XXs`

**Step 4: Commit**

```bash
git add packages/web/src/pages/ProfilePage.tsx packages/web/src/App.tsx
git commit -m "feat: add /profile page for user to set start date, employment type, job title"
```

---

### Task 10: Dashboard Profile Completeness Banner

**Files:**
- Modify: `packages/web/src/pages/DashboardPage.tsx`

**Step 1: Read `DashboardPage.tsx`** to understand the existing layout and find where to add the banner.

**Step 2: Add the banner** at the top of the dashboard content (after the page heading, before the category sections).

Import `Link` from react-router-dom if not already imported.

Add this logic before the return statement (using the existing `summaries` data from `useUsageSummary`):
```typescript
const hasIncompleteEligibility = summaries?.some((s) => s.eligible === 'unknown') ?? false;
```

Add the banner JSX at the top of the dashboard content area:
```tsx
{hasIncompleteEligibility && (
  <div className="mb-6 flex items-center gap-3 border-3 border-amber-400 bg-amber-50 rounded-brutal p-4 shadow-brutal">
    <span className="text-amber-500 text-lg">⚠️</span>
    <p className="text-sm text-amber-800 flex-1">
      Some benefits have eligibility requirements.{' '}
      <Link to="/profile" className="font-semibold underline hover:no-underline">
        Complete your profile →
      </Link>{' '}
      to see which apply to you.
    </p>
  </div>
)}
```

**Step 3: Verify Vite build passes**

```bash
cd packages/web && npx vite build 2>&1 | tail -10
```

**Step 4: Commit**

```bash
git add packages/web/src/pages/DashboardPage.tsx
git commit -m "feat: show profile completeness banner on dashboard when eligibility is unknown"
```

---

### Task 11: BenefitDashboardCard — Eligibility Badge

**Files:**
- Modify: `packages/web/src/components/BenefitDashboardCard.tsx`

**Step 1: Read `BenefitDashboardCard.tsx`** to understand the props interface and card layout.

**Step 2: Update the `BenefitData` (or equivalent) interface** to include the two new fields from `UsageSummary`:
```typescript
eligible?: true | false | 'unknown';
unmet_rules?: string[];
```

**Step 3: Add the eligibility badge** in the card JSX, placed immediately after the benefit name / description area and before the usage section:

```tsx
{/* Eligibility badge */}
{benefit.eligible === false && benefit.unmet_rules && benefit.unmet_rules.length > 0 && (
  <div
    className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 rounded px-2 py-1 mb-2"
    title={benefit.unmet_rules.join(' · ')}
  >
    <span>⚠️</span>
    <span>May not apply to you</span>
  </div>
)}
{benefit.eligible === 'unknown' && benefit.unmet_rules && benefit.unmet_rules.length > 0 && (
  <Link
    to="/profile"
    className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 rounded px-2 py-1 mb-2 hover:bg-gray-200"
  >
    <span>❓</span>
    <span>Complete profile to check eligibility</span>
  </Link>
)}
```

Make sure `Link` is imported from `react-router-dom` (it already should be from the "View details →" link added previously).

**Step 4: Verify Vite build passes**

```bash
cd packages/web && npx vite build 2>&1 | tail -10
```

**Step 5: Commit**

```bash
git add packages/web/src/components/BenefitDashboardCard.tsx
git commit -m "feat: show eligibility badge on BenefitDashboardCard"
```

---

### Task 12: BenefitDetailPage — Eligibility Section

**Files:**
- Modify: `packages/web/src/pages/BenefitDetailPage.tsx`

**Step 1: Read `BenefitDetailPage.tsx`** to understand the layout and what data is available.

**Step 2: Import `useBenefitRules`** and `Link`:
```typescript
import { useBenefitRules } from '../hooks/useBenefitRules';
import { Link } from 'react-router-dom';
```

**Step 3: Fetch rules and user's usage summary** for this benefit. The page already uses `useBenefit(id)` and `useUsageSummary()`. From the usage summary, find the entry for this benefit to get `eligible` and `unmet_rules`. Also load `useBenefitRules(id)` for the full rule list with labels.

```typescript
const { data: rules } = useBenefitRules(id ?? null);
const summaryEntry = summaries?.find((s) => s.benefit_id === id);
```

**Step 4: Add the Eligibility section** in the page — insert after the "How to Claim" section:

```tsx
{/* Eligibility section — only show if there are rules */}
{rules && rules.length > 0 && (
  <section className="card-brutal p-5">
    <h2 className="font-bold text-ink mb-3">Eligibility</h2>
    <ul className="space-y-2">
      {rules.map((rule) => {
        const unmet = summaryEntry?.unmet_rules?.includes(rule.label);
        const unknown = summaryEntry?.eligible === 'unknown' && unmet;
        const fail = summaryEntry?.eligible === false && unmet;
        return (
          <li key={rule.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 text-base leading-none">
              {fail ? '❌' : unknown ? '❓' : '✅'}
            </span>
            <span className={fail ? 'text-red-700' : unknown ? 'text-gray-500' : 'text-gray-700'}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
    {summaryEntry?.eligible !== true && (
      <p className="mt-3 text-xs text-gray-500">
        <Link to="/profile" className="underline font-medium">Update your profile →</Link>
        {' '}to check your eligibility accurately.
      </p>
    )}
  </section>
)}
```

**Step 5: Verify Vite build passes**

```bash
cd packages/web && npx vite build 2>&1 | tail -10
```

**Step 6: Commit**

```bash
git add packages/web/src/pages/BenefitDetailPage.tsx
git commit -m "feat: add eligibility section to BenefitDetailPage"
```

---

### Task 13: BenefitCard — Eligibility Rules Editor

Add a rules editor to `BenefitCard` edit mode so union admins can add/remove eligibility rules.

**Files:**
- Modify: `packages/web/src/components/BenefitCard.tsx`

**Step 1: Read `BenefitCard.tsx`** to understand the edit mode form structure and where to add the new section.

**Step 2: Import the hooks**:
```typescript
import { useBenefitRules, useAddBenefitRule, useDeleteBenefitRule } from '../hooks/useBenefitRules';
import type { EligibilityRule } from '../hooks/useBenefitRules';
```

**Step 3: Add state for the "add rule" form** inside the component:
```typescript
const { data: rules = [] } = useBenefitRules(benefit.id ?? null);
const addRule = useAddBenefitRule(benefit.id ?? '');
const deleteRule = useDeleteBenefitRule(benefit.id ?? '');

const [newRuleKey, setNewRuleKey] = useState('tenure_months');
const [newRuleOp, setNewRuleOp] = useState('gte');
const [newRuleValue, setNewRuleValue] = useState('');
const [newRuleLabel, setNewRuleLabel] = useState('');
```

**Step 4: Add the Eligibility Rules section** at the bottom of the edit form, before the save/cancel buttons:

```tsx
{/* ── Eligibility Rules ────────────────────────────────── */}
<div className="border-t border-ink/10 pt-4 mt-4">
  <h4 className="text-sm font-semibold text-ink mb-3">Eligibility Rules</h4>

  {/* Existing rules */}
  {rules.length > 0 ? (
    <ul className="space-y-2 mb-3">
      {rules.map((rule) => (
        <li key={rule.id} className="flex items-center justify-between gap-2 text-sm bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
          <span className="text-gray-700">{rule.label}</span>
          <button
            type="button"
            onClick={() => deleteRule.mutate(rule.id)}
            className="text-red-500 hover:text-red-700 font-bold text-xs"
            title="Remove rule"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-xs text-gray-400 mb-3">No eligibility rules — benefit applies to all members.</p>
  )}

  {/* Add rule form */}
  <details className="text-sm">
    <summary className="cursor-pointer text-perky-600 font-medium hover:underline">+ Add rule</summary>
    <div className="mt-3 space-y-2 p-3 bg-gray-50 border border-gray-200 rounded">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Attribute</label>
          <select
            value={newRuleKey}
            onChange={(e) => {
              setNewRuleKey(e.target.value);
              setNewRuleOp(e.target.value === 'tenure_months' ? 'gte' : 'eq');
              setNewRuleValue('');
            }}
            className="input-brutal w-full text-xs py-1"
          >
            <option value="tenure_months">Tenure (months)</option>
            <option value="employment_type">Employment type</option>
            <option value="job_title">Job title</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Condition</label>
          <select
            value={newRuleOp}
            onChange={(e) => setNewRuleOp(e.target.value)}
            className="input-brutal w-full text-xs py-1"
          >
            {newRuleKey === 'tenure_months' && <>
              <option value="gte">at least</option>
              <option value="lte">at most</option>
            </>}
            {newRuleKey === 'employment_type' && <>
              <option value="eq">is exactly</option>
              <option value="neq">is not</option>
            </>}
            {newRuleKey === 'job_title' && <>
              <option value="contains">contains</option>
              <option value="eq">is exactly</option>
            </>}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Value</label>
          {newRuleKey === 'employment_type' ? (
            <select
              value={newRuleValue}
              onChange={(e) => setNewRuleValue(e.target.value)}
              className="input-brutal w-full text-xs py-1"
            >
              <option value="">— Select —</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="casual">Casual</option>
              <option value="permanent">Permanent</option>
              <option value="fixed_term">Fixed-term</option>
            </select>
          ) : (
            <input
              type={newRuleKey === 'tenure_months' ? 'number' : 'text'}
              value={newRuleValue}
              onChange={(e) => setNewRuleValue(e.target.value)}
              placeholder={newRuleKey === 'tenure_months' ? 'e.g. 6' : 'e.g. Manager'}
              className="input-brutal w-full text-xs py-1"
              min={newRuleKey === 'tenure_months' ? 0 : undefined}
            />
          )}
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Label (shown to user)</label>
        <input
          type="text"
          value={newRuleLabel}
          onChange={(e) => setNewRuleLabel(e.target.value)}
          placeholder="e.g. 6+ months tenure required"
          className="input-brutal w-full text-xs py-1"
          maxLength={300}
        />
      </div>
      <button
        type="button"
        disabled={!newRuleValue || !newRuleLabel || addRule.isPending}
        onClick={async () => {
          if (!newRuleValue || !newRuleLabel) return;
          await addRule.mutateAsync({
            key: newRuleKey,
            operator: newRuleOp as EligibilityRule['operator'],
            value: newRuleValue,
            label: newRuleLabel,
          });
          setNewRuleValue('');
          setNewRuleLabel('');
        }}
        className="btn-primary text-xs py-1 px-3"
      >
        {addRule.isPending ? 'Adding…' : 'Add rule'}
      </button>
    </div>
  </details>
</div>
```

**Step 5: Verify Vite build passes**

```bash
cd packages/web && npx vite build 2>&1 | tail -10
```
Expected: `✓ built in X.XXs`

**Step 6: Commit**

```bash
git add packages/web/src/components/BenefitCard.tsx
git commit -m "feat: add eligibility rules editor to BenefitCard edit mode"
```

---

### Task 14: Add Profile Link to Nav

So users can discover and reach `/profile`.

**Files:**
- Modify: `packages/web/src/components/Layout.tsx` (or wherever the nav is)

**Step 1: Read `Layout.tsx`** to find the navigation structure.

**Step 2: Add a "Profile" link** to the user nav/menu area (near logout):

```tsx
<Link to="/profile" className="text-sm text-gray-600 hover:text-ink">
  My Profile
</Link>
```

**Step 3: Verify Vite build passes**

```bash
cd packages/web && npx vite build 2>&1 | tail -10
```

**Step 4: Final commit**

```bash
git add packages/web/src/components/Layout.tsx
git commit -m "feat: add My Profile link to navigation"
```

---

## Summary of All Changes

| Task | Files | What it does |
|---|---|---|
| 1 | `migrations/0004_eligibility.sql` | Creates `user_attributes` + `benefit_eligibility_rules` tables |
| 2 | `services/eligibility.ts` | EAV CRUD + rule evaluation logic |
| 3 | `routes/profile.ts`, `index.ts` | GET/PUT /api/profile/attributes |
| 4 | `routes/benefits.ts` | GET/POST/DELETE eligibility rules per benefit |
| 5 | `services/usage.ts` | Adds `eligible` + `unmet_rules` to usage summary |
| 6 | `services/extraction.ts` | AI extracts eligibility_rules from PDFs |
| 7 | `routes/documents.ts`, `routes/self-service.ts` | Persists extracted rules on accept |
| 8 | `hooks/useUsage.ts`, `hooks/useProfile.ts`, `hooks/useBenefitRules.ts` | Frontend types and data fetching |
| 9 | `pages/ProfilePage.tsx`, `App.tsx` | User profile form at /profile |
| 10 | `pages/DashboardPage.tsx` | Profile completeness banner |
| 11 | `components/BenefitDashboardCard.tsx` | Eligibility badge |
| 12 | `pages/BenefitDetailPage.tsx` | Eligibility section with rule status |
| 13 | `components/BenefitCard.tsx` | Admin rules editor in edit mode |
| 14 | `components/Layout.tsx` | My Profile nav link |
