import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { joinAgreementSchema } from '@perky/shared';
import { findAgreementByAccessCode } from '../services/agreement';

const member = new Hono<AppEnv>();

member.use('*', requireAuth);

// Join an agreement by access code
member.post('/join',
  zValidator('json', joinAgreementSchema),
  async (c) => {
    const user = c.get('user')!;
    const { access_code } = c.req.valid('json');

    // Look up the agreement
    const agreement = await findAgreementByAccessCode(c.env.DB, access_code.toUpperCase());
    if (!agreement) {
      return c.json({ error: 'Invalid or inactive access code' }, 404);
    }

    const ag = agreement as any;

    // Check if already joined
    const existing = await c.env.DB.prepare(
      'SELECT id FROM member_agreements WHERE user_id = ? AND agreement_id = ?'
    ).bind(user.id, ag.id).first();

    if (existing) {
      return c.json({ error: 'You have already joined this agreement' }, 409);
    }

    // Insert member_agreement
    const maId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    await c.env.DB.prepare(
      'INSERT INTO member_agreements (id, user_id, agreement_id) VALUES (?, ?, ?)'
    ).bind(maId, user.id, ag.id).run();

    // Also add union_membership if not already a member
    const existingMembership = await c.env.DB.prepare(
      'SELECT id FROM union_memberships WHERE user_id = ? AND union_id = ?'
    ).bind(user.id, ag.union_id).first();

    if (!existingMembership) {
      const umId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
      await c.env.DB.prepare(
        'INSERT INTO union_memberships (id, user_id, union_id, role) VALUES (?, ?, ?, ?)'
      ).bind(umId, user.id, ag.union_id, 'member').run();
    }

    // Return the agreement with union info
    const fullAgreement = await c.env.DB.prepare(`
      SELECT ca.*, u.name as union_name
      FROM collective_agreements ca
      JOIN unions u ON ca.union_id = u.id
      WHERE ca.id = ?
    `).bind(ag.id).first();

    return c.json({ data: fullAgreement }, 201);
  }
);

// List member's agreements with union info
member.get('/agreements', async (c) => {
  const user = c.get('user')!;

  const result = await c.env.DB.prepare(`
    SELECT ca.id, ca.union_id, ca.title, ca.status, ca.access_code,
           ca.document_url, ca.created_at, ca.updated_at,
           u.name as union_name, ma.joined_at,
           COUNT(b.id) as benefit_count
    FROM member_agreements ma
    JOIN collective_agreements ca ON ma.agreement_id = ca.id
    JOIN unions u ON ca.union_id = u.id
    LEFT JOIN benefits b ON ca.id = b.agreement_id
    WHERE ma.user_id = ?
    GROUP BY ca.id, ca.union_id, ca.title, ca.status, ca.access_code,
             ca.document_url, ca.created_at, ca.updated_at, u.name, ma.joined_at
    ORDER BY ma.joined_at DESC
  `).bind(user.id).all();

  return c.json({ data: result.results });
});

// Leave (unjoin) an agreement
member.delete('/agreements/:agreementId', async (c) => {
  const user = c.get('user')!;
  const { agreementId } = c.req.param();

  // Verify the user has actually joined this agreement
  const existing = await c.env.DB.prepare(
    'SELECT id FROM member_agreements WHERE user_id = ? AND agreement_id = ?'
  ).bind(user.id, agreementId).first();

  if (!existing) {
    return c.json({ error: 'Agreement not found' }, 404);
  }

  // Remove the membership
  await c.env.DB.prepare(
    'DELETE FROM member_agreements WHERE user_id = ? AND agreement_id = ?'
  ).bind(user.id, agreementId).run();

  return c.json({ success: true });
});

export default member;
