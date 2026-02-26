import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { requireRole, requireUnionAdmin } from '../middleware/authorize';
import { createAgreement, findAgreementById, findAgreementsByUnionId, updateAgreement, publishAgreement } from '../services/agreement';
import { findUnionById } from '../services/union';

const agreements = new Hono<AppEnv>();

agreements.use('*', requireAuth);

/**
 * Verify user is an admin for an agreement's union.
 */
async function verifyAgreementAdmin(db: D1Database, agreementId: string, user: { id: string; role: string }): Promise<Record<string, any> | null> {
  const agreement = await findAgreementById(db, agreementId);
  if (!agreement) return null;

  if (user.role === 'platform_admin') return agreement;

  const ag = agreement as any;
  const membership = await db.prepare(
    'SELECT role FROM union_memberships WHERE user_id = ? AND union_id = ?'
  ).bind(user.id, ag.union_id).first<{ role: string }>();

  return membership?.role === 'admin' ? agreement : null;
}

/**
 * Verify user has read access (admin or member) to an agreement.
 */
async function verifyAgreementAccess(db: D1Database, agreementId: string, user: { id: string; role: string }): Promise<Record<string, any> | null> {
  const agreement = await findAgreementById(db, agreementId);
  if (!agreement) return null;

  if (user.role === 'platform_admin') return agreement;

  const ag = agreement as any;

  // Check union admin
  const membership = await db.prepare(
    'SELECT role FROM union_memberships WHERE user_id = ? AND union_id = ?'
  ).bind(user.id, ag.union_id).first<{ role: string }>();
  if (membership?.role === 'admin') return agreement;

  // Check member access
  const memberAccess = await db.prepare(
    'SELECT id FROM member_agreements WHERE user_id = ? AND agreement_id = ?'
  ).bind(user.id, agreementId).first();
  if (memberAccess) return agreement;

  return null;
}

// List agreements for a union
agreements.get('/union/:unionId',
  requireUnionAdmin('unionId'),
  async (c) => {
    const result = await findAgreementsByUnionId(c.env.DB, c.req.param('unionId'));
    return c.json({ data: result });
  }
);

// Create agreement
agreements.post('/union/:unionId',
  requireUnionAdmin('unionId'),
  zValidator('json', z.object({
    title: z.string().min(1).max(500),
  })),
  async (c) => {
    const user = c.get('user')!;
    const { title } = c.req.valid('json');
    const unionId = c.req.param('unionId');

    const union = await findUnionById(c.env.DB, unionId);
    if (!union) return c.json({ error: 'Union not found' }, 404);

    const agreement = await createAgreement(c.env.DB, {
      union_id: unionId,
      title,
      uploaded_by: user.id,
    });

    return c.json({ data: agreement }, 201);
  }
);

// Get agreement detail (admin or member)
agreements.get('/:id', async (c) => {
  const user = c.get('user')!;
  const agreement = await verifyAgreementAccess(c.env.DB, c.req.param('id'), user);
  if (!agreement) return c.json({ error: 'Agreement not found' }, 404);
  return c.json({ data: agreement });
});

// Update agreement (union admin only)
agreements.put('/:id',
  zValidator('json', z.object({
    title: z.string().min(1).max(500).optional(),
  })),
  async (c) => {
    const user = c.get('user')!;
    const existing = await verifyAgreementAdmin(c.env.DB, c.req.param('id'), user);
    if (!existing) return c.json({ error: 'Agreement not found' }, 404);
    const data = c.req.valid('json');
    const agreement = await updateAgreement(c.env.DB, c.req.param('id'), data);
    return c.json({ data: agreement });
  }
);

// Publish agreement (union admin only)
agreements.put('/:id/publish', async (c) => {
  const user = c.get('user')!;
  const existing = await verifyAgreementAdmin(c.env.DB, c.req.param('id'), user);
  if (!existing) return c.json({ error: 'Agreement not found' }, 404);
  try {
    const agreement = await publishAgreement(c.env.DB, c.req.param('id'));
    return c.json({ data: agreement });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to publish';
    return c.json({ error: message }, 400);
  }
});

// Request public listing (union admin only)
agreements.post('/:id/request-public', async (c) => {
  const user = c.get('user')!;
  const agreement = await verifyAgreementAdmin(c.env.DB, c.req.param('id'), user);
  if (!agreement) return c.json({ error: 'Agreement not found' }, 404);
  const ag = agreement as any;
  if (ag.status !== 'published') {
    return c.json({ error: 'Agreement must be published first' }, 400);
  }
  return c.json({ data: { message: 'Public listing requested. A platform admin will review it.' } });
});

// List published agreements pending public approval (platform admin)
agreements.get('/pending-public/list',
  requireRole('platform_admin'),
  async (c) => {
    const result = await c.env.DB.prepare(`
      SELECT ca.*, u.name as union_name
      FROM collective_agreements ca
      JOIN unions u ON ca.union_id = u.id
      WHERE ca.status = 'published'
      ORDER BY ca.updated_at DESC
    `).all();
    return c.json({ data: result.results });
  }
);

// Approve public listing (platform admin)
agreements.put('/:id/approve-public',
  requireRole('platform_admin'),
  async (c) => {
    const agreement = await updateAgreement(c.env.DB, c.req.param('id'), { status: 'public_approved' });
    return c.json({ data: agreement });
  }
);

export default agreements;
