import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { findAgreementById, updateAgreement } from '../services/agreement';
import { extractBenefitsFromPdf } from '../services/extraction';
import { createBenefit } from '../services/benefit';
import { addEligibilityRule, type Operator } from '../services/eligibility';

const documents = new Hono<AppEnv>();

documents.use('*', requireAuth);

/** Validate that the buffer starts with the PDF magic bytes (%PDF-) */
function isPdfFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const header = new Uint8Array(buffer, 0, 5);
  return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46 && header[4] === 0x2D;
}

/** Sanitize filename: keep only safe characters, limit length */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

/** Zod schema for the accept endpoint body */
const acceptBenefitsSchema = z.object({
  benefits: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    category: z.enum(['leave', 'health', 'financial', 'professional_development', 'workplace', 'pay', 'protection', 'process', 'other']),
    unit_type: z.enum(['hours', 'days', 'weeks', 'dollars', 'count']),
    limit_amount: z.number().positive().nullable().optional(),
    period: z.enum(['per_month', 'per_year', 'per_occurrence', 'unlimited']),
    eligibility_notes: z.string().max(2000).nullable().optional(),
    clause_text: z.string().max(5000).nullable().optional(),
    plain_english: z.string().max(2000).nullable().optional(),
    claim_process: z.string().max(2000).nullable().optional(),
    clause_reference: z.string().max(100).nullable().optional(),
    eligibility_rules: z.array(z.object({
      key: z.string().min(1).max(100),
      operator: z.enum(['gte', 'lte', 'eq', 'neq', 'contains']),
      value: z.string().min(1).max(200),
      label: z.string().min(1).max(300),
    })).optional(),
  })).min(1, 'At least one benefit is required'),
  title: z.string().min(1).max(500).optional(),
});

// Upload PDF for an agreement
documents.post('/upload/:agreementId', async (c) => {
  const agreementId = c.req.param('agreementId');

  const agreement = await findAgreementById(c.env.DB, agreementId);
  if (!agreement) return c.json({ error: 'Agreement not found' }, 404);

  // Check union admin access
  const user = c.get('user')!;
  const ag = agreement as any;
  if (user.role !== 'platform_admin') {
    const membership = await c.env.DB.prepare(
      'SELECT role FROM union_memberships WHERE user_id = ? AND union_id = ?'
    ).bind(user.id, ag.union_id).first<{ role: string }>();
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized' }, 403);
    }
  }

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400);
  }

  if (file.type !== 'application/pdf') {
    return c.json({ error: 'Only PDF files are accepted' }, 400);
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: 'File must be under 10MB' }, 400);
  }

  const fileBuffer = await file.arrayBuffer();

  // Validate PDF magic bytes
  if (!isPdfFile(fileBuffer)) {
    return c.json({ error: 'File does not appear to be a valid PDF' }, 400);
  }

  // Upload to R2 with sanitized filename
  const safeName = sanitizeFilename(file.name);
  const key = `agreements/${agreementId}/${Date.now()}-${safeName}`;

  await c.env.DOCUMENTS.put(key, fileBuffer, {
    httpMetadata: {
      contentType: 'application/pdf',
    },
    customMetadata: {
      agreementId,
      originalName: safeName,
      uploadedBy: user.id,
    },
  });

  // Update agreement with document URL
  await updateAgreement(c.env.DB, agreementId, {
    document_url: key,
  });

  return c.json({
    data: {
      key,
      filename: safeName,
      size: file.size,
    },
  }, 201);
});

// Extract benefits from uploaded PDF using AI
documents.post('/extract/:agreementId', async (c) => {
  const agreementId = c.req.param('agreementId');

  const agreement = await findAgreementById(c.env.DB, agreementId);
  if (!agreement) return c.json({ error: 'Agreement not found' }, 404);

  const ag = agreement as any;

  // Check union admin access
  const user = c.get('user')!;
  if (user.role !== 'platform_admin') {
    const membership = await c.env.DB.prepare(
      'SELECT role FROM union_memberships WHERE user_id = ? AND union_id = ?'
    ).bind(user.id, ag.union_id).first<{ role: string }>();
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized' }, 403);
    }
  }

  if (!ag.document_url) {
    return c.json({ error: 'No document uploaded for this agreement' }, 400);
  }

  // Get PDF from R2
  const object = await c.env.DOCUMENTS.get(ag.document_url);
  if (!object) {
    return c.json({ error: 'Document not found in storage' }, 404);
  }

  const pdfBytes = await object.arrayBuffer();

  // Extract benefits using AI — sends PDF directly to Claude
  if (!c.env.CLAUDE_API_KEY) {
    return c.json({ error: 'AI extraction not configured (missing CLAUDE_API_KEY)' }, 500);
  }

  try {
    const result = await extractBenefitsFromPdf(c.env.CLAUDE_API_KEY, pdfBytes);
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI extraction failed';
    return c.json({ error: message }, 500);
  }
});

// Accept extracted benefits (human review -> commit to DB)
documents.post('/accept/:agreementId',
  zValidator('json', acceptBenefitsSchema),
  async (c) => {
    const agreementId = c.req.param('agreementId');

    const agreement = await findAgreementById(c.env.DB, agreementId);
    if (!agreement) return c.json({ error: 'Agreement not found' }, 404);

    const ag = agreement as any;

    // Check union admin access
    const user = c.get('user')!;
    if (user.role !== 'platform_admin') {
      const membership = await c.env.DB.prepare(
        'SELECT role FROM union_memberships WHERE user_id = ? AND union_id = ?'
      ).bind(user.id, ag.union_id).first<{ role: string }>();
      if (!membership || membership.role !== 'admin') {
        return c.json({ error: 'Not authorized' }, 403);
      }
    }

    const { benefits, title } = c.req.valid('json');

    // Update title if provided
    if (title) {
      await updateAgreement(c.env.DB, agreementId, { title });
    }

    // Create each benefit
    const created = [];
    for (const b of benefits) {
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
      created.push(benefit);

      // Save extracted eligibility rules if any
      if (b.eligibility_rules?.length && benefit) {
        for (const rule of b.eligibility_rules) {
          await addEligibilityRule(c.env.DB, (benefit as any).id, {
            key: rule.key,
            operator: rule.operator as Operator,
            value: rule.value,
            label: rule.label,
          });
        }
      }
    }

    return c.json({ data: { count: created.length, benefits: created } }, 201);
  }
);

// Remove uploaded PDF from an agreement
documents.delete('/remove/:agreementId', async (c) => {
  const agreementId = c.req.param('agreementId');

  const agreement = await findAgreementById(c.env.DB, agreementId);
  if (!agreement) return c.json({ error: 'Agreement not found' }, 404);

  const ag = agreement as any;

  // Check admin access
  const user = c.get('user')!;
  if (user.role !== 'platform_admin') {
    const membership = await c.env.DB.prepare(
      'SELECT role FROM union_memberships WHERE user_id = ? AND union_id = ?'
    ).bind(user.id, ag.union_id).first<{ role: string }>();
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized' }, 403);
    }
  }

  if (!ag.document_url) {
    return c.json({ error: 'No document to remove' }, 400);
  }

  // Delete from R2
  try {
    await c.env.DOCUMENTS.delete(ag.document_url);
  } catch (err) {
    console.error('Failed to delete from R2:', err);
  }

  // Clear the document_url on the agreement
  await updateAgreement(c.env.DB, agreementId, { document_url: '' });

  return c.json({ success: true });
});

export default documents;
