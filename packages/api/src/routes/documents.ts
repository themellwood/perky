import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { requireUnionAdmin } from '../middleware/authorize';
import { findAgreementById, updateAgreement } from '../services/agreement';
import { extractBenefitsFromPdf } from '../services/extraction';
import { createBenefit } from '../services/benefit';

const documents = new Hono<AppEnv>();

documents.use('*', requireAuth);

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

  // Upload to R2
  const key = `agreements/${agreementId}/${Date.now()}-${file.name}`;
  const fileBuffer = await file.arrayBuffer();

  await c.env.DOCUMENTS.put(key, fileBuffer, {
    httpMetadata: {
      contentType: 'application/pdf',
    },
    customMetadata: {
      agreementId,
      originalName: file.name,
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
      filename: file.name,
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
documents.post('/accept/:agreementId', async (c) => {
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

  // Body: { benefits: [...], title?: string }
  const body = await c.req.json();
  const { benefits, title } = body;

  if (!Array.isArray(benefits) || benefits.length === 0) {
    return c.json({ error: 'At least one benefit is required' }, 400);
  }

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
  }

  return c.json({ data: { count: created.length, benefits: created } }, 201);
});

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
