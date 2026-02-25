// ── Types ───────────────────────────────────────────────────────────────────

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
  eligibility_rules: Array<{
    key: string;
    operator: string;
    value: string;
    label: string;
  }> | null;
}

export interface ExtractionResult {
  benefits: ExtractedBenefit[];
  agreement_title_suggestion: string | null;
  raw_summary: string;
}

// ── Prompt ──────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are an expert at analyzing collective bargaining agreements (CBAs) and union contracts.

Read the attached PDF and extract EVERY benefit, right, entitlement, allowance, protection, and process that could benefit an employee.

Be exhaustive. Include ALL of the following types:
- Leave (sick, annual, bereavement, parental, domestic violence, long service, jury duty, etc.)
- Health (health spending accounts, dental, vision, wellness, EAP, etc.)
- Financial (allowances, reimbursements, bonuses, superannuation/kiwisaver, etc.)
- Pay entitlements (overtime rates, penalty rates, shift allowances, higher duties, etc.)
- Professional development (training funds, study leave, conference allowances, etc.)
- Workplace (flexible work, remote work, parking, uniforms, etc.)
- Protections (redundancy, termination notice, health & safety, discrimination, etc.)
- Processes (dispute resolution, grievance procedures, consultation rights, etc.)
- Any other employee entitlements

Do NOT skip benefits because they seem minor or hard to quantify.

For EACH benefit, provide ALL of these fields:
- name: Short descriptive name (max 200 chars)
- description: One-sentence summary for a card display (max 150 chars)
- category: One of: leave, health, financial, pay, professional_development, workplace, protection, process, other
- clause_text: The EXACT verbatim text from the agreement that establishes this benefit (include the full relevant paragraph)
- plain_english: A clear 2-4 sentence explanation of what this means in practice, written for someone with no legal background
- claim_process: How an employee claims or uses this benefit. If the agreement specifies a process, use it. Otherwise suggest a reasonable one (e.g. "Contact HR to request this leave").
- unit_type: One of: hours, days, weeks, dollars, count. Use "count" for non-quantifiable benefits.
- limit_amount: The numeric limit (e.g. 15 for "15 days"), or null if unlimited/not quantifiable
- period: One of: per_month, per_year, per_occurrence, unlimited. Use "unlimited" for non-quantifiable benefits.
- eligibility_notes: Any conditions, waiting periods, or requirements. Null if none.
- clause_reference: The section/clause number (e.g. "Section 14.3", "Clause 8.2"), or null if not identifiable
- eligibility_rules: Array of structured eligibility requirements. For each requirement found in the eligibility_notes, provide:
  - key: One of "tenure_months" (for time-in-role requirements), "employment_type" (full_time/part_time/casual/permanent/fixed_term), "job_title" (for title/classification requirements), or a descriptive snake_case key for anything else
  - operator: "gte" (at least), "lte" (at most), "eq" (exactly), "neq" (not), "contains" (includes)
  - value: The threshold value as a string (e.g. "6" for 6 months, "permanent" for permanent employment)
  - label: Human-readable label (e.g. "6+ months tenure required", "Permanent employees only")
  If there are no eligibility restrictions, use an empty array [].

Also provide at the top level:
- agreement_title_suggestion: A suggested title for this collective agreement
- raw_summary: A 2-3 sentence summary of the overall agreement

Respond with ONLY valid JSON — no markdown, no explanation, just the JSON object:
{
  "agreement_title_suggestion": "...",
  "raw_summary": "...",
  "benefits": [
    {
      "name": "...",
      "description": "...",
      "category": "...",
      "clause_text": "...",
      "plain_english": "...",
      "claim_process": "...",
      "unit_type": "...",
      "limit_amount": null,
      "period": "...",
      "eligibility_notes": null,
      "clause_reference": "...",
      "eligibility_rules": [
        { "key": "tenure_months", "operator": "gte", "value": "6", "label": "6+ months tenure required" }
      ]
    }
  ]
}`;

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['leave', 'health', 'financial', 'professional_development', 'workplace', 'pay', 'protection', 'process', 'other'] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractJson(text: string): any {
  const trimmed = text.trim();

  // 1. Try raw parse
  try { return JSON.parse(trimmed); } catch { /* continue */ }

  // 2. Try extracting from markdown code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* continue */ }
  }

  // 3. Try brace-matching for complete JSON
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    for (let i = firstBrace; i < trimmed.length; i++) {
      if (trimmed[i] === '{') depth++;
      else if (trimmed[i] === '}') depth--;
      if (depth === 0) {
        try { return JSON.parse(trimmed.slice(firstBrace, i + 1)); } catch { break; }
      }
    }
  }

  // 4. Handle truncated JSON (e.g. response hit max_tokens mid-output)
  //    Strip markdown fencing if present, then try to repair the JSON
  let jsonStr = trimmed;
  const fenceStart = jsonStr.match(/^```(?:json)?\s*\n?/);
  if (fenceStart) {
    jsonStr = jsonStr.slice(fenceStart[0].length);
  }
  // Remove trailing incomplete fence
  jsonStr = jsonStr.replace(/\n?\s*```?\s*$/, '');

  // Find the start of the JSON object
  const objStart = jsonStr.indexOf('{');
  if (objStart !== -1) {
    jsonStr = jsonStr.slice(objStart);

    // Repair truncated benefits array: remove last incomplete item, close structure
    const lastCompleteItem = jsonStr.lastIndexOf('},');
    if (lastCompleteItem !== -1) {
      const repaired = jsonStr.slice(0, lastCompleteItem + 1) + ']';
      let openBraces = 0;
      for (const ch of repaired) {
        if (ch === '{') openBraces++;
        else if (ch === '}') openBraces--;
      }
      const closed = repaired + '}'.repeat(Math.max(0, openBraces));
      try {
        const result = JSON.parse(closed);
        console.warn('[extraction] Repaired truncated JSON (response likely hit max_tokens)');
        return result;
      } catch { /* continue */ }
    }
  }

  console.error('[extraction] Failed to extract JSON:', trimmed.slice(0, 500));
  throw new Error('Failed to parse AI results. Please try again.');
}

function validateEnum<T extends string>(value: any, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value) ? value : fallback;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── API caller ───────────────────────────────────────────────────────────────

async function callClaudeApi(
  apiKey: string,
  pdfBase64: string,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[extraction] Claude API error:', response.status, errorBody);

    if (response.status === 429) {
      throw new Error(
        'Rate limit reached — large documents use many tokens. Please wait 1-2 minutes and try again.'
      );
    }
    if (response.status === 413) {
      throw new Error(
        'Document is too large for AI processing. Try uploading a shorter version.'
      );
    }
    if (response.status === 400 && errorBody.includes('maximum of 100 PDF pages')) {
      throw new Error(
        'PDF has too many pages — the AI can only process up to 100 pages at a time. Try uploading a shorter document or splitting it into sections.'
      );
    }
    throw new Error(`AI extraction failed (HTTP ${response.status}). Please try again.`);
  }

  const result = await response.json() as any;
  const content = result.content?.[0]?.text;
  const stopReason = result.stop_reason;
  console.log(`[extraction] Got response (${content?.length || 0} chars, stop_reason: ${stopReason})`);

  if (stopReason === 'max_tokens') {
    console.warn('[extraction] Response was truncated (hit max_tokens limit) — will attempt to repair JSON');
  }

  if (!content) {
    throw new Error('AI returned empty response. Please try again.');
  }

  return content;
}

// ── Main extraction ──────────────────────────────────────────────────────────

export async function extractBenefitsFromPdf(
  apiKey: string,
  pdfBytes: ArrayBuffer
): Promise<ExtractionResult> {
  const sizeMB = (pdfBytes.byteLength / (1024 * 1024)).toFixed(1);
  console.log(`[extraction] Sending ${sizeMB}MB PDF to Claude for analysis...`);

  const base64 = arrayBufferToBase64(pdfBytes);
  const content = await callClaudeApi(apiKey, base64, EXTRACTION_PROMPT, 16384);
  const parsed = extractJson(content);

  const benefits: ExtractedBenefit[] = (parsed.benefits || []).map((b: any) => ({
    name: String(b.name || '').slice(0, 200),
    description: String(b.description || '').slice(0, 1000),
    category: validateEnum(b.category, CATEGORIES, 'other'),
    unit_type: validateEnum(b.unit_type, ['hours', 'days', 'weeks', 'dollars', 'count'] as const, 'count'),
    limit_amount: typeof b.limit_amount === 'number' && b.limit_amount > 0 ? b.limit_amount : null,
    period: validateEnum(b.period, ['per_month', 'per_year', 'per_occurrence', 'unlimited'] as const, 'per_year'),
    eligibility_notes: b.eligibility_notes ? String(b.eligibility_notes).slice(0, 2000) : null,
    clause_text: b.clause_text ? String(b.clause_text).slice(0, 5000) : null,
    plain_english: b.plain_english ? String(b.plain_english).slice(0, 2000) : null,
    claim_process: b.claim_process ? String(b.claim_process).slice(0, 2000) : null,
    clause_reference: b.clause_reference ? String(b.clause_reference).slice(0, 100) : null,
    eligibility_rules: Array.isArray(b.eligibility_rules)
      ? b.eligibility_rules
          .filter((r: any) => r.key && r.operator && r.value && r.label)
          .map((r: any) => ({
            key: String(r.key).slice(0, 100),
            operator: validateEnum(r.operator, ['gte', 'lte', 'eq', 'neq', 'contains'] as const, 'eq'),
            value: String(r.value).slice(0, 200),
            label: String(r.label).slice(0, 300),
          }))
      : null,
  }));

  console.log(`[extraction] Extracted ${benefits.length} benefits`);

  return {
    benefits,
    agreement_title_suggestion: parsed.agreement_title_suggestion
      ? String(parsed.agreement_title_suggestion)
      : null,
    raw_summary: String(parsed.raw_summary || ''),
  };
}
