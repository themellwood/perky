import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { findAgreementById, updateAgreement } from '../services/agreement';
import { extractBenefitsFromPdf } from '../services/extraction';
import { createBenefit } from '../services/benefit';
import { addEligibilityRule, type Operator } from '../services/eligibility';

const selfService = new Hono<AppEnv>();

selfService.use('*', requireAuth);

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

/**
 * Get or create a personal union for the current user.
 * Returns the union ID.
 */
async function getOrCreatePersonalUnion(db: D1Database, userId: string, userEmail: string): Promise<string> {
  // Check if user already has a personal union
  const existing = await db.prepare(
    "SELECT id FROM unions WHERE created_by = ? AND type = 'personal'"
  ).bind(userId).first<{ id: string }>();

  if (existing) return existing.id;

  // Create a personal union
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  await db.prepare(
    "INSERT INTO unions (id, name, description, created_by, type) VALUES (?, ?, ?, ?, 'personal')"
  ).bind(id, `Personal — ${userEmail}`, 'Personal agreement uploads', userId).run();

  // Add user as admin of their personal union
  const umId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  await db.prepare(
    "INSERT INTO union_memberships (id, user_id, union_id, role) VALUES (?, ?, ?, 'admin')"
  ).bind(umId, userId, id).run();

  return id;
}

/**
 * Verify the user owns a personal agreement.
 */
async function verifyPersonalAgreement(db: D1Database, agreementId: string, userId: string) {
  const agreement = await db.prepare(`
    SELECT ca.* FROM collective_agreements ca
    JOIN unions u ON ca.union_id = u.id
    WHERE ca.id = ? AND u.type = 'personal' AND u.created_by = ?
  `).bind(agreementId, userId).first();

  return agreement;
}

// List user's personal agreements
selfService.get('/agreements', async (c) => {
  const user = c.get('user')!;

  const result = await c.env.DB.prepare(`
    SELECT ca.id, ca.title, ca.status, ca.document_url, ca.created_at, ca.updated_at,
           COUNT(b.id) as benefit_count
    FROM collective_agreements ca
    JOIN unions u ON ca.union_id = u.id
    LEFT JOIN benefits b ON ca.id = b.agreement_id
    WHERE u.type = 'personal' AND u.created_by = ?
    GROUP BY ca.id
    ORDER BY ca.created_at DESC
  `).bind(user.id).all();

  return c.json({ data: result.results });
});

// Create a new personal agreement + upload PDF
selfService.post('/upload', async (c) => {
  const user = c.get('user')!;

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const title = (formData.get('title') as string) || 'My Agreement';

  if (!file) return c.json({ error: 'No file uploaded' }, 400);
  if (file.type !== 'application/pdf') return c.json({ error: 'Only PDF files are accepted' }, 400);
  if (file.size > 25 * 1024 * 1024) return c.json({ error: 'File must be under 25MB' }, 400);

  const fileBuffer = await file.arrayBuffer();

  // Validate PDF magic bytes
  if (!isPdfFile(fileBuffer)) {
    return c.json({ error: 'File does not appear to be a valid PDF' }, 400);
  }

  // Get or create personal union
  const unionId = await getOrCreatePersonalUnion(c.env.DB, user.id, user.email);

  // Create agreement
  const agreementId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  await c.env.DB.prepare(
    "INSERT INTO collective_agreements (id, union_id, title, status, uploaded_by) VALUES (?, ?, ?, 'draft', ?)"
  ).bind(agreementId, unionId, title, user.id).run();

  // Upload PDF to R2 with sanitized filename
  const safeName = sanitizeFilename(file.name);
  const key = `personal/${user.id}/${agreementId}/${Date.now()}-${safeName}`;

  await c.env.DOCUMENTS.put(key, fileBuffer, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: {
      agreementId,
      originalName: safeName,
      uploadedBy: user.id,
    },
  });

  // Update agreement with document URL
  await updateAgreement(c.env.DB, agreementId, { document_url: key });

  // Auto-join member to their own agreement
  const maId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  await c.env.DB.prepare(
    'INSERT INTO member_agreements (id, user_id, agreement_id) VALUES (?, ?, ?)'
  ).bind(maId, user.id, agreementId).run();

  return c.json({
    data: {
      agreementId,
      key,
      filename: safeName,
      size: file.size,
    },
  }, 201);
});

// Extract benefits from a personal agreement PDF
selfService.post('/extract/:agreementId', async (c) => {
  const user = c.get('user')!;
  const agreementId = c.req.param('agreementId');

  const agreement = await verifyPersonalAgreement(c.env.DB, agreementId, user.id);
  if (!agreement) return c.json({ error: 'Agreement not found' }, 404);

  const ag = agreement as any;
  if (!ag.document_url) {
    return c.json({ error: 'No document uploaded for this agreement' }, 400);
  }

  const object = await c.env.DOCUMENTS.get(ag.document_url);
  if (!object) return c.json({ error: 'Document not found in storage' }, 404);

  const pdfBytes = await object.arrayBuffer();

  if (!c.env.CLAUDE_API_KEY) {
    return c.json({ error: 'AI extraction not configured' }, 500);
  }

  try {
    const result = await extractBenefitsFromPdf(c.env.CLAUDE_API_KEY, pdfBytes);
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI extraction failed';
    return c.json({ error: message }, 500);
  }
});

// Accept extracted benefits for a personal agreement
selfService.post('/accept/:agreementId',
  zValidator('json', acceptBenefitsSchema),
  async (c) => {
    const user = c.get('user')!;
    const agreementId = c.req.param('agreementId');

    const agreement = await verifyPersonalAgreement(c.env.DB, agreementId, user.id);
    if (!agreement) return c.json({ error: 'Agreement not found' }, 404);

    const { benefits, title } = c.req.valid('json');

    // Update title if provided
    if (title) {
      await updateAgreement(c.env.DB, agreementId, { title });
    }

    // Delete existing benefits (allow re-extraction)
    await c.env.DB.prepare('DELETE FROM benefits WHERE agreement_id = ?').bind(agreementId).run();

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

    // Mark as published so benefits show on dashboard
    await updateAgreement(c.env.DB, agreementId, { status: 'published' });

    return c.json({ data: { count: created.length } }, 201);
  }
);

// Delete a personal agreement
selfService.delete('/:agreementId', async (c) => {
  const user = c.get('user')!;
  const agreementId = c.req.param('agreementId');

  const agreement = await verifyPersonalAgreement(c.env.DB, agreementId, user.id);
  if (!agreement) return c.json({ error: 'Agreement not found' }, 404);

  const ag = agreement as any;

  // Delete PDF from R2 if exists
  if (ag.document_url) {
    try {
      await c.env.DOCUMENTS.delete(ag.document_url);
    } catch (err) {
      console.error('Failed to delete from R2:', err);
    }
  }

  // Delete agreement (cascades to benefits, member_agreements via FK)
  await c.env.DB.prepare('DELETE FROM collective_agreements WHERE id = ?').bind(agreementId).run();

  return c.json({ success: true });
});

export default selfService;
