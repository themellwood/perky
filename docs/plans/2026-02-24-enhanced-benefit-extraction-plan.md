# Enhanced Benefit Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace single-pass extraction with a two-pass system that captures all benefits, add exact clause text / plain-English explanations / claim processes, and build a benefit detail page with inline usage tracking.

**Architecture:** New DB migration adds 4 columns to `benefits`. Extraction service becomes two functions (scan + detail). Documents route orchestrates both. New `/benefits/:id` page uses existing usage hooks. All category arrays expanded to 9 categories throughout the codebase.

**Tech Stack:** D1 (SQLite), Hono, Zod, React, Tailwind CSS, Anthropic Claude API (PDFs beta)

**Design doc:** `docs/plans/2026-02-24-enhanced-benefit-extraction-design.md`

---

### Task 1: Database migration — add new columns to benefits

**Files:**
- Create: `migrations/0003_benefit_details.sql`

**Step 1:** Create the migration file:

```sql
-- Enhanced benefit extraction: add clause text, plain english, claim process, and clause reference
ALTER TABLE benefits ADD COLUMN clause_text TEXT;
ALTER TABLE benefits ADD COLUMN plain_english TEXT;
ALTER TABLE benefits ADD COLUMN claim_process TEXT;
ALTER TABLE benefits ADD COLUMN clause_reference TEXT;
```

**Step 2:** Apply the migration locally:

Run: `cd packages/api && npx wrangler d1 execute perky-db --local --file=../../migrations/0003_benefit_details.sql`
Expected: Migration applied successfully.

**Step 3:** Commit:

```bash
git add migrations/0003_benefit_details.sql
git commit -m "feat: add clause_text, plain_english, claim_process, clause_reference columns to benefits"
```

---

### Task 2: Update benefit service to handle new fields

**Files:**
- Modify: `packages/api/src/services/benefit.ts`

**Step 1:** Update `createBenefit` function signature and INSERT statement to accept and store the 4 new fields (`clause_text`, `plain_english`, `claim_process`, `clause_reference`). All optional/nullable. Add them to the INSERT column list and bind values.

Current INSERT (line 19-26):
```typescript
await db.prepare(`
  INSERT INTO benefits (id, agreement_id, name, description, category, unit_type, limit_amount, period, eligibility_notes, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  id, data.agreement_id, data.name, data.description || null,
  data.category, data.unit_type, data.limit_amount ?? null,
  data.period, data.eligibility_notes || null, sortOrder
).run();
```

New INSERT:
```typescript
await db.prepare(`
  INSERT INTO benefits (id, agreement_id, name, description, category, unit_type, limit_amount, period, eligibility_notes, sort_order, clause_text, plain_english, claim_process, clause_reference)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  id, data.agreement_id, data.name, data.description || null,
  data.category, data.unit_type, data.limit_amount ?? null,
  data.period, data.eligibility_notes || null, sortOrder,
  data.clause_text || null, data.plain_english || null,
  data.claim_process || null, data.clause_reference || null
).run();
```

**Step 2:** Update `createBenefit` function parameter type to include new optional fields:
```typescript
clause_text?: string;
plain_english?: string;
claim_process?: string;
clause_reference?: string;
```

**Step 3:** Update `updateBenefit` function parameter type and add 4 new field handlers following the existing pattern (lines 54-60):
```typescript
if (data.clause_text !== undefined) { fields.push('clause_text = ?'); values.push(data.clause_text); }
if (data.plain_english !== undefined) { fields.push('plain_english = ?'); values.push(data.plain_english); }
if (data.claim_process !== undefined) { fields.push('claim_process = ?'); values.push(data.claim_process); }
if (data.clause_reference !== undefined) { fields.push('clause_reference = ?'); values.push(data.clause_reference); }
```

**Step 4:** Verify TypeScript compiles:

Run: `cd packages/api && npx tsc --noEmit`
Expected: No errors.

**Step 5:** Commit:

```bash
git add packages/api/src/services/benefit.ts
git commit -m "feat: support new benefit detail fields in create and update service"
```

---

### Task 3: Update benefits API route with expanded schema

**Files:**
- Modify: `packages/api/src/routes/benefits.ts`

**Step 1:** Expand the `benefitSchema` zod object (line 12-20) to:
- Add new categories to the category enum: `'pay'`, `'protection'`, `'process'`
- Add 4 new optional fields: `clause_text`, `plain_english`, `claim_process`, `clause_reference`

New schema:
```typescript
const benefitSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['leave', 'health', 'financial', 'professional_development', 'workplace', 'pay', 'protection', 'process', 'other']),
  unit_type: z.enum(['hours', 'days', 'weeks', 'dollars', 'count']),
  limit_amount: z.number().positive().nullable().optional(),
  period: z.enum(['per_month', 'per_year', 'per_occurrence', 'unlimited']),
  eligibility_notes: z.string().max(2000).optional(),
  clause_text: z.string().max(5000).optional(),
  plain_english: z.string().max(2000).optional(),
  claim_process: z.string().max(2000).optional(),
  clause_reference: z.string().max(100).optional(),
});
```

**Step 2:** Add `GET /benefits/:id` endpoint (after the existing list endpoint, before create). This fetches a single benefit by ID:

```typescript
// Get single benefit by ID
benefits.get('/:id', async (c) => {
  const id = c.req.param('id');
  const benefit = await findBenefitById(c.env.DB, id);
  if (!benefit) return c.json({ error: 'Benefit not found' }, 404);
  return c.json({ data: benefit });
});
```

Import `findBenefitById` from `../services/benefit` (it already exists, just needs adding to the import).

**Important:** Place this route BEFORE the `/:id` PUT and DELETE routes, but AFTER the `/agreement/:agreementId` routes — otherwise `/agreement/xyz` would match `/:id` as a GET. Actually, looking at the current code, the GET for `/agreement/:agreementId` is at line 23 and uses a different prefix, so the new `GET /:id` just needs to be placed after the agreement-prefixed routes. Place it right after the list route (after line 26).

**Step 3:** Update the accept endpoint in `packages/api/src/routes/documents.ts` (line 157-174) to pass the new fields through when creating benefits:

```typescript
const benefit = await createBenefit(c.env.DB, {
  agreement_id: agreementId,
  name: b.name,
  description: b.description || undefined,
  category: b.category,
  unit_type: b.unit_type,
  limit_amount: b.limit_amount ?? null,
  period: b.period,
  eligibility_notes: b.eligibility_notes || undefined,
  clause_text: b.clause_text || undefined,
  plain_english: b.plain_english || undefined,
  claim_process: b.claim_process || undefined,
  clause_reference: b.clause_reference || undefined,
});
```

**Step 4:** Verify TypeScript compiles:

Run: `cd packages/api && npx tsc --noEmit`
Expected: No errors.

**Step 5:** Commit:

```bash
git add packages/api/src/routes/benefits.ts packages/api/src/routes/documents.ts
git commit -m "feat: expand benefit schema with new fields and add GET /benefits/:id endpoint"
```

---

### Task 4: Rewrite extraction service with two-pass approach

**Files:**
- Modify: `packages/api/src/services/extraction.ts`

**Step 1:** Replace the entire file. The new version has:

**Types:**
```typescript
interface ScannedBenefit {
  name: string;
  category: string;
  clause_reference: string | null;
}

interface ScanResult {
  benefits: ScannedBenefit[];
  agreement_title_suggestion: string | null;
  raw_summary: string;
}

interface ExtractedBenefit {
  name: string;
  description: string;
  category: 'leave' | 'health' | 'financial' | 'professional_development' | 'workplace' | 'pay' | 'protection' | 'process' | 'other';
  unit_type: 'hours' | 'days' | 'weeks' | 'dollars' | 'count';
  limit_amount: number | null;
  period: 'per_month' | 'per_year' | 'per_occurrence' | 'unlimited';
  eligibility_notes: string | null;
  clause_text: string | null;
  plain_english: string | null;
  claim_process: string | null;
  clause_reference: string | null;
}

export interface ExtractionResult {
  benefits: ExtractedBenefit[];
  agreement_title_suggestion: string | null;
  raw_summary: string;
}
```

**Pass 1 prompt (`SCAN_PROMPT`):**
```
You are an expert at analyzing collective bargaining agreements (CBAs) and union contracts.
Scan the attached PDF and list EVERY benefit, right, entitlement, allowance, protection, and process that could benefit an employee.

Be exhaustive. Include ALL of the following:
- Leave types (sick, annual, bereavement, parental, domestic violence, long service, jury duty, etc.)
- Health benefits (health spending accounts, dental, vision, wellness, EAP, etc.)
- Financial benefits (allowances, reimbursements, bonuses, superannuation/kiwisaver, etc.)
- Pay entitlements (overtime rates, penalty rates, shift allowances, higher duties, etc.)
- Professional development (training funds, study leave, conference allowances, etc.)
- Workplace benefits (flexible work, remote work, parking, uniforms, etc.)
- Protections (redundancy, termination notice, health & safety, discrimination, etc.)
- Processes (dispute resolution, grievance procedures, consultation rights, etc.)
- Any other employee entitlements not covered above

For each benefit found, provide:
- name: Short descriptive name
- category: One of: leave, health, financial, pay, professional_development, workplace, protection, process, other
- clause_reference: The section/clause number where this appears (e.g., "Section 14.3", "Clause 8.2"), or null if not identifiable

Also provide:
- agreement_title_suggestion: A suggested title for this collective agreement
- raw_summary: A 2-3 sentence summary of the overall agreement

Do NOT skip benefits because they seem minor or hard to quantify. List everything.

Respond with ONLY valid JSON:
{
  "benefits": [{ "name": "...", "category": "...", "clause_reference": "..." }, ...],
  "agreement_title_suggestion": "...",
  "raw_summary": "..."
}
```

**Pass 2 prompt (`DETAIL_PROMPT` — template, benefits list injected):**
```
You are an expert at analyzing collective bargaining agreements. For each of the following benefits found in this agreement, extract detailed information.

Benefits to detail:
{BENEFIT_LIST_JSON}

For EACH benefit listed above, provide:
- name: Keep the same name from the list
- description: One-sentence summary for a card display (max 150 chars)
- category: Keep the same category from the list
- clause_text: The EXACT text from the agreement that establishes this benefit. Quote it verbatim. Include the full relevant paragraph(s).
- plain_english: A clear, accessible explanation of what this benefit means in practice. Write it so someone with no legal background can understand it. 2-4 sentences.
- claim_process: How an employee should claim or use this benefit. If the agreement describes a specific process (forms, who to contact, notice period), include that. If the agreement doesn't specify, suggest a reasonable process based on the benefit type (e.g., "Contact your HR department to request this leave" or "Submit a claim form to your manager with receipts").
- unit_type: One of: hours, days, weeks, dollars, count. Use "count" if the benefit is not quantifiable.
- limit_amount: The numeric limit (e.g., 15 for "15 days"), or null if unlimited or not quantifiable.
- period: One of: per_month, per_year, per_occurrence, unlimited. Use "unlimited" for non-quantifiable benefits.
- eligibility_notes: Any conditions, waiting periods, or requirements. Null if none.
- clause_reference: Keep the same clause_reference from the list

Respond with ONLY valid JSON:
{
  "benefits": [{ "name": "...", "description": "...", "category": "...", "clause_text": "...", "plain_english": "...", "claim_process": "...", "unit_type": "...", "limit_amount": ..., "period": "...", "eligibility_notes": "...", "clause_reference": "..." }, ...]
}
```

**Functions:**

1. `scanBenefitsFromPdf(apiKey, pdfBytes)` — Sends PDF + SCAN_PROMPT, returns `ScanResult`. Uses max_tokens 4096 (lightweight output).

2. `extractBenefitDetailsFromPdf(apiKey, pdfBytes, scannedBenefits)` — Sends PDF + DETAIL_PROMPT with benefit list injected. Uses max_tokens 16384 (detailed output). If `scannedBenefits.length > 30`, splits into batches of 15 and makes multiple calls, merging results.

3. `extractBenefitsFromPdf(apiKey, pdfBytes)` — Public entry point. Calls `scanBenefitsFromPdf`, then `extractBenefitDetailsFromPdf`, returns combined `ExtractionResult` with title and summary from Pass 1.

Keep existing helpers: `callClaudeApi` (extracted from current fetch logic), `extractJson`, `validateEnum`, `arrayBufferToBase64`. The `callClaudeApi` helper centralizes the HTTP call, error handling (429, 413, 400/100-page), and response parsing.

**Validation in Pass 2 output:** Expand `validateEnum` calls to include new categories (`'pay'`, `'protection'`, `'process'`). Truncate new string fields: `clause_text` to 5000, `plain_english` to 2000, `claim_process` to 2000, `clause_reference` to 100.

**Step 2:** Verify TypeScript compiles:

Run: `cd packages/api && npx tsc --noEmit`
Expected: No errors.

**Step 3:** Commit:

```bash
git add packages/api/src/services/extraction.ts
git commit -m "feat: two-pass extraction with scan + detail prompts and expanded categories"
```

---

### Task 5: Update frontend types and hooks

**Files:**
- Modify: `packages/web/src/hooks/useDocuments.ts`
- Modify: `packages/web/src/hooks/useBenefits.ts`
- Modify: `packages/web/src/hooks/useUsage.ts`

**Step 1:** Update `ExtractedBenefit` interface in `useDocuments.ts` (line 4-12) to add:
```typescript
clause_text: string | null;
plain_english: string | null;
claim_process: string | null;
clause_reference: string | null;
```

**Step 2:** Update `Benefit` interface in `useBenefits.ts` (line 4-15) to add:
```typescript
clause_text: string | null;
plain_english: string | null;
claim_process: string | null;
clause_reference: string | null;
```

**Step 3:** Add a `useBenefit(id)` hook in `useBenefits.ts` for fetching a single benefit:
```typescript
export function useBenefit(id: string) {
  return useQuery({
    queryKey: ['benefit', id],
    queryFn: () => api.get<{ data: Benefit }>(`/benefits/${id}`).then(r => r.data),
    enabled: !!id,
  });
}
```

**Step 4:** Update `UsageSummary` interface in `useUsage.ts` (line 4-17) to add the new fields so the detail page can access them:
```typescript
clause_text: string | null;
plain_english: string | null;
claim_process: string | null;
clause_reference: string | null;
```

Note: The usage summary SQL in the API service joins on benefits, so `SELECT b.*` will automatically include the new columns. Verify this by checking `packages/api/src/services/usage.ts` — if it uses `SELECT b.*` it will work. If it selects specific columns, those need updating too.

**Step 5:** Verify TypeScript compiles:

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors unrelated to our changes).

**Step 6:** Commit:

```bash
git add packages/web/src/hooks/useDocuments.ts packages/web/src/hooks/useBenefits.ts packages/web/src/hooks/useUsage.ts
git commit -m "feat: add new benefit fields to frontend types and useBenefit hook"
```

---

### Task 6: Update DocumentUpload review phase with new fields

**Files:**
- Modify: `packages/web/src/components/DocumentUpload.tsx`

**Step 1:** Add the 3 new categories to the `CATEGORIES` array (line 10-17):
```typescript
{ value: 'pay', label: 'Pay' },
{ value: 'protection', label: 'Protection' },
{ value: 'process', label: 'Process' },
```

**Step 2:** In the review phase section (around line 360-425), add 4 new editable fields for each benefit AFTER the eligibility_notes input (line 415-422). Add them inside the `!excluded &&` block:

```tsx
{/* New fields */}
<div className="col-span-2">
  <label className="block text-xs font-medium text-gray-500 mb-0.5">Clause Reference</label>
  <input
    value={benefit.clause_reference || ''}
    onChange={(e) => updateBenefit(index, 'clause_reference', e.target.value || null)}
    placeholder="e.g., Section 14.3"
    className="input-brutal w-full px-2 py-1.5 text-sm"
  />
</div>
<div className="col-span-2">
  <label className="block text-xs font-medium text-gray-500 mb-0.5">Exact Clause Text</label>
  <textarea
    value={benefit.clause_text || ''}
    onChange={(e) => updateBenefit(index, 'clause_text', e.target.value || null)}
    placeholder="Exact wording from the agreement..."
    rows={3}
    className="input-brutal w-full px-2 py-1.5 text-sm resize-none"
  />
</div>
<div className="col-span-2">
  <label className="block text-xs font-medium text-gray-500 mb-0.5">Plain English</label>
  <textarea
    value={benefit.plain_english || ''}
    onChange={(e) => updateBenefit(index, 'plain_english', e.target.value || null)}
    placeholder="What this benefit means in simple terms..."
    rows={2}
    className="input-brutal w-full px-2 py-1.5 text-sm resize-none"
  />
</div>
<div className="col-span-2">
  <label className="block text-xs font-medium text-gray-500 mb-0.5">How to Claim</label>
  <textarea
    value={benefit.claim_process || ''}
    onChange={(e) => updateBenefit(index, 'claim_process', e.target.value || null)}
    placeholder="Steps to claim this benefit..."
    rows={2}
    className="input-brutal w-full px-2 py-1.5 text-sm resize-none"
  />
</div>
```

**Step 3:** Update the analyzing phase message text (line 275) to reflect two-pass:
Change "Reading the collective agreement and identifying all benefits..." to:
"Pass 1: Scanning for all benefits... Pass 2: Extracting detailed information..."

Or keep it simple: "Scanning the agreement and extracting benefit details... This takes two AI passes."

**Step 4:** Verify TypeScript compiles:

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors.

**Step 5:** Commit:

```bash
git add packages/web/src/components/DocumentUpload.tsx
git commit -m "feat: add new benefit fields to DocumentUpload review phase"
```

---

### Task 7: Update BenefitCard admin editor with new fields

**Files:**
- Modify: `packages/web/src/components/BenefitCard.tsx`

**Step 1:** Add the 3 new categories to the `CATEGORIES` array (line 3-9):
```typescript
{ value: 'pay', label: 'Pay' },
{ value: 'protection', label: 'Protection' },
{ value: 'process', label: 'Process' },
```

**Step 2:** Update the `BenefitData` interface (line 27-35) to include new fields:
```typescript
clause_text?: string;
plain_english?: string;
claim_process?: string;
clause_reference?: string;
```

**Step 3:** Update the `useState` initial form state (line 49-57) to include:
```typescript
clause_text: benefit?.clause_text || '',
plain_english: benefit?.plain_english || '',
claim_process: benefit?.claim_process || '',
clause_reference: benefit?.clause_reference || '',
```

**Step 4:** In the view mode (line 70-94), add display for `clause_reference` if present:
```tsx
{benefit.clause_reference && (
  <span className="text-xs text-gray-400 ml-2">({benefit.clause_reference})</span>
)}
```

**Step 5:** In the edit form (line 97-153), add 4 new fields after the eligibility_notes textarea (after line 141):
```tsx
<div className="col-span-2">
  <label className="block text-xs font-medium text-gray-700 mb-1">Clause Reference</label>
  <input value={form.clause_reference} onChange={e => setForm({...form, clause_reference: e.target.value})}
    placeholder="e.g., Section 14.3" className="input-brutal w-full text-sm" />
</div>
<div className="col-span-2">
  <label className="block text-xs font-medium text-gray-700 mb-1">Exact Clause Text</label>
  <textarea value={form.clause_text} onChange={e => setForm({...form, clause_text: e.target.value})}
    rows={3} placeholder="Exact wording from the agreement" className="input-brutal w-full text-sm" />
</div>
<div className="col-span-2">
  <label className="block text-xs font-medium text-gray-700 mb-1">Plain English</label>
  <textarea value={form.plain_english} onChange={e => setForm({...form, plain_english: e.target.value})}
    rows={2} placeholder="What this means in simple terms" className="input-brutal w-full text-sm" />
</div>
<div className="col-span-2">
  <label className="block text-xs font-medium text-gray-700 mb-1">How to Claim</label>
  <textarea value={form.claim_process} onChange={e => setForm({...form, claim_process: e.target.value})}
    rows={2} placeholder="Steps to claim this benefit" className="input-brutal w-full text-sm" />
</div>
```

**Step 6:** Verify TypeScript compiles:

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors.

**Step 7:** Commit:

```bash
git add packages/web/src/components/BenefitCard.tsx
git commit -m "feat: add new benefit fields to BenefitCard admin editor"
```

---

### Task 8: Update BenefitDashboardCard with "View details" link and new categories

**Files:**
- Modify: `packages/web/src/components/BenefitDashboardCard.tsx`

**Step 1:** Add the 3 new categories to `CATEGORY_ICONS` (line 6-13):
```typescript
pay: '💵',
protection: '🛡️',
process: '⚖️',
```

**Step 2:** Add the 3 new categories to `CATEGORY_COLORS` (line 15-22):
```typescript
pay: 'bg-emerald-50 border-emerald-200',
protection: 'bg-red-50 border-red-200',
process: 'bg-slate-50 border-slate-200',
```

**Step 3:** Import `Link` from `react-router-dom` at the top of the file.

**Step 4:** Add a "View details" link after the action buttons div (after line 138, before the expandable history):

```tsx
{/* Detail link */}
<Link
  to={`/benefits/${benefit_id}`}
  className="block text-center text-sm text-perky-600 hover:text-perky-700 font-semibold mt-2"
>
  View details →
</Link>
```

**Step 5:** Verify TypeScript compiles:

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors.

**Step 6:** Commit:

```bash
git add packages/web/src/components/BenefitDashboardCard.tsx
git commit -m "feat: add View details link and new category icons to BenefitDashboardCard"
```

---

### Task 9: Create BenefitDetailPage

**Files:**
- Create: `packages/web/src/pages/BenefitDetailPage.tsx`

**Step 1:** Create the page component. It uses:
- `useParams` to get the benefit `:id`
- `useBenefit(id)` hook for benefit data
- `useUsageSummary()` to get usage data for this benefit
- `LogUsageModal` and `UsageHistory` components (already exist)
- `Layout` wrapper (same as dashboard)

Structure:
```tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useBenefit } from '../hooks/useBenefits';
import { useUsageSummary } from '../hooks/useUsage';
import { LogUsageModal } from '../components/LogUsageModal';
import { UsageHistory } from '../components/UsageHistory';
```

**Sections:**

1. **Header**: Back link, benefit name as `<h1>`, category badge, clause_reference badge if present.

2. **At a Glance card** (`card-brutal`): Description text, limit/period display (e.g., "15 days per year"), eligibility notes if present.

3. **Your Usage card** (`card-brutal`): Progress bar (reuse same logic as BenefitDashboardCard — percentage calc, color coding), used/remaining text, "Log Usage" button that opens LogUsageModal, UsageHistory component inline.

4. **Exact Wording card** (`card-brutal`): Shows if `clause_text` exists. Clause reference as a small label. `clause_text` in a styled blockquote (`bg-[#fafaf5] border-l-4 border-fight-500 pl-4 italic text-ink/80`).

5. **What This Means card** (`card-brutal`): Shows if `plain_english` exists. Plain readable text.

6. **How to Claim card** (`card-brutal`): Shows if `claim_process` exists. Claim process text. If the benefit has no `clause_text` for the claim process section (meaning it was AI-suggested), show a small `badge-brutal bg-fight-100` badge: "AI suggested".

**Category icons/colors**: Import from a shared constant, or duplicate the small map from BenefitDashboardCard.

**Loading state**: Spinner matching existing pattern.

**Not found state**: If benefit is null after loading, show "Benefit not found" with link back to dashboard.

**Step 2:** Verify TypeScript compiles:

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors.

**Step 3:** Commit:

```bash
git add packages/web/src/pages/BenefitDetailPage.tsx
git commit -m "feat: add BenefitDetailPage with usage tracking and clause details"
```

---

### Task 10: Update DashboardPage category labels and wire up route

**Files:**
- Modify: `packages/web/src/pages/DashboardPage.tsx`
- Modify: `packages/web/src/App.tsx`

**Step 1:** Update `CATEGORY_ORDER` array in DashboardPage (line 8) to include new categories:
```typescript
const CATEGORY_ORDER = ['leave', 'health', 'financial', 'pay', 'professional_development', 'workplace', 'protection', 'process', 'other'];
```

**Step 2:** Update `categoryLabels` object in DashboardPage (line 52-59) to include:
```typescript
pay: 'Pay & Allowances',
protection: 'Protections',
process: 'Processes & Rights',
```

**Step 3:** In `App.tsx`, import `BenefitDetailPage`:
```typescript
import { BenefitDetailPage } from './pages/BenefitDetailPage';
```

**Step 4:** Add the protected route for `/benefits/:id` in `App.tsx`. Place it after the `/my-agreements` route:
```tsx
<Route
  path="/benefits/:id"
  element={
    <ProtectedRoute>
      <BenefitDetailPage />
    </ProtectedRoute>
  }
/>
```

**Step 5:** Verify TypeScript compiles:

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors.

**Step 6:** Commit:

```bash
git add packages/web/src/pages/DashboardPage.tsx packages/web/src/App.tsx
git commit -m "feat: wire up BenefitDetailPage route and expand category labels"
```

---

### Task 11: Check usage summary service includes new columns

**Files:**
- Check: `packages/api/src/services/usage.ts` — verify the `getUsageSummary` SQL query includes the new benefit columns

**Step 1:** Read `packages/api/src/services/usage.ts` and check what columns the summary query selects from the benefits table.

If it uses `SELECT b.*`, no change needed — the new columns flow through automatically.

If it selects specific columns (e.g., `b.name, b.description, b.category`), add: `b.clause_text, b.plain_english, b.claim_process, b.clause_reference`.

**Step 2:** If changes were needed, verify TypeScript compiles:

Run: `cd packages/api && npx tsc --noEmit`
Expected: No errors.

**Step 3:** Commit (only if changes were made):

```bash
git add packages/api/src/services/usage.ts
git commit -m "feat: include new benefit fields in usage summary query"
```

---

### Task 12: Verify end-to-end

**Verification steps:**

1. **TypeScript** — Run `npx tsc --noEmit` in each package (api, web). All should pass.

2. **Migration** — Confirm `migrations/0003_benefit_details.sql` can be applied.

3. **Start preview servers** (with user permission) and check:
   - Dashboard loads, benefit cards show "View details →" link
   - Clicking "View details →" navigates to `/benefits/:id`
   - Benefit detail page renders all sections (at a glance, usage, exact wording, what this means, how to claim)
   - Log usage works from the detail page
   - Back to dashboard link works
   - Admin agreement editor: upload a PDF, extraction runs (2 passes visible in API logs), review phase shows new fields
   - New categories appear in category dropdowns

4. **Screenshot verification** of benefit detail page and updated review phase.

---

### Key pattern references
- Benefit service CRUD: `packages/api/src/services/benefit.ts`
- Extraction + PDF beta: `packages/api/src/services/extraction.ts`
- Documents route (upload/extract/accept flow): `packages/api/src/routes/documents.ts`
- Benefits route (CRUD + reorder): `packages/api/src/routes/benefits.ts`
- Dashboard card: `packages/web/src/components/BenefitDashboardCard.tsx`
- Admin editor card: `packages/web/src/components/BenefitCard.tsx`
- Upload + review flow: `packages/web/src/components/DocumentUpload.tsx`
- Usage hooks: `packages/web/src/hooks/useUsage.ts`
- Benefit hooks: `packages/web/src/hooks/useBenefits.ts`
- Document hooks: `packages/web/src/hooks/useDocuments.ts`
- Migration pattern: `migrations/0001_initial_schema.sql`, `migrations/0002_personal_unions.sql`
- Dashboard grouping: `packages/web/src/pages/DashboardPage.tsx`
- Route wiring: `packages/web/src/App.tsx`
