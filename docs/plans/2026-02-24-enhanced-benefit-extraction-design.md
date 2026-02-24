# Enhanced Benefit Extraction & Benefit Detail Page

**Date:** 2026-02-24
**Status:** Approved

## Problem

The current extraction misses benefits because the prompt focuses on "quantifiable benefits that employees can track usage of." Non-quantifiable rights, protections, processes, and granular sub-types are skipped. Additionally, extracted benefits lack the exact agreement wording and claim instructions that members need.

## Goals

1. Extract ALL benefits from an agreement — not just trackable ones
2. Capture exact clause text, plain-English explanations, and claim processes
3. Provide a benefit detail page where members can read full details and log usage

## Extraction Approach: Two-Pass

### Pass 1 — Discovery Scan

Broad prompt with no category restrictions. Instructs Claude to list every benefit, right, entitlement, allowance, protection, and process. Returns lightweight JSON:

```json
{
  "benefits": [
    { "name": "Annual Leave", "category": "leave", "clause_reference": "Section 12.1" },
    { "name": "Redundancy Protection", "category": "protection", "clause_reference": "Section 28" }
  ],
  "agreement_title_suggestion": "...",
  "raw_summary": "..."
}
```

### Pass 2 — Detail Extraction

Sends the PDF again with the benefit list from Pass 1. For each benefit, extracts:

- `clause_text`: Exact quoted text from the agreement (verbatim)
- `plain_english`: Accessible explanation a non-expert can understand
- `claim_process`: How to claim — extracted from agreement if stated, AI-suggested if not
- `unit_type`, `limit_amount`, `period`: Quantitative limits (null if not applicable)
- `eligibility_notes`: Conditions or requirements
- `description`: Short one-liner for card display

**Batching fallback:** If Pass 1 finds more than 30 benefits, Pass 2 splits into batches of 15.

### Expanded Categories

Current: `leave`, `health`, `financial`, `professional_development`, `workplace`, `other`

Added: `pay`, `protection`, `process`

- `pay`: Overtime rates, penalty rates, allowances, salary scales
- `protection`: Redundancy, termination, discrimination, health & safety
- `process`: Dispute resolution, grievance procedures, consultation requirements

## Data Model Changes

### New columns on `benefits` table

| Column | Type | Constraints |
|--------|------|-------------|
| `clause_text` | TEXT | Nullable, max 5000 chars |
| `plain_english` | TEXT | Nullable, max 2000 chars |
| `claim_process` | TEXT | Nullable, max 2000 chars |
| `clause_reference` | TEXT | Nullable, max 100 chars |

All nullable — existing benefits are unaffected. The shared zod schema adds these as optional string fields.

## Benefit Detail Page

**Route:** `/benefits/:id` (protected, members only)

### Page Sections

1. **Header** — Benefit name, category badge, "Back to dashboard" link
2. **At a glance** — Short description, limit/period, eligibility notes
3. **Your usage** — Progress bar, log usage form, usage history (inline)
4. **Exact wording** — `clause_text` in a blockquote with `clause_reference` label
5. **What this means** — `plain_english` in readable prose
6. **How to claim** — `claim_process` text, with "AI suggested" badge if not from agreement

### Navigation

- BenefitDashboardCard gains a "View details" link → `/benefits/:id`
- Detail page has "Back to dashboard" link

### New API Endpoint

- `GET /benefits/:id` — Returns a single benefit by ID (authenticated)

## Changes to Existing Components

### DocumentUpload (review phase)

Add editable fields for `clause_text`, `plain_english`, `claim_process`, and `clause_reference` so admins can review/correct before accepting.

### BenefitCard (admin editor)

Add `clause_text`, `plain_english`, `claim_process` as textareas and `clause_reference` as text input in edit mode.

### BenefitDashboardCard

Add "View details" link at the bottom of each card.

### Extraction Service

Replace single `extractBenefits` with two functions:
- `scanBenefits(pdfBase64)` — Pass 1, returns lightweight list
- `extractBenefitDetails(pdfBase64, benefitList)` — Pass 2, returns full details

Documents route orchestrates both calls sequentially. Existing error handling (100-page limit, rate limits, etc.) preserved.

### Database Migration

One migration adding the 4 new nullable columns to `benefits`.
