import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { createBenefit, findBenefitById, findBenefitsByAgreementId, updateBenefit, deleteBenefit, reorderBenefits } from '../services/benefit';
import {
  getRulesForBenefit, addEligibilityRule, deleteEligibilityRule,
  type Operator
} from '../services/eligibility';

const benefits = new Hono<AppEnv>();

benefits.use('*', requireAuth);

const eligibilityRuleSchema = z.object({
  key: z.string().min(1).max(100),
  operator: z.enum(['gte', 'lte', 'eq', 'neq', 'contains']),
  value: z.string().min(1).max(200),
  label: z.string().min(1).max(300),
});

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

/**
 * Check if user is an admin for the agreement's union.
 * Returns the agreement union_id if authorized, null otherwise.
 */
async function requireAgreementAdmin(db: D1Database, agreementId: string, user: { id: string; role: string }): Promise<boolean> {
  if (user.role === 'platform_admin') return true;

  const agreement = await db.prepare(
    'SELECT union_id FROM collective_agreements WHERE id = ?'
  ).bind(agreementId).first<{ union_id: string }>();
  if (!agreement) return false;

  const membership = await db.prepare(
    'SELECT role FROM union_memberships WHERE user_id = ? AND union_id = ?'
  ).bind(user.id, agreement.union_id).first<{ role: string }>();

  return membership?.role === 'admin';
}

/**
 * Check if user has read access to a benefit (admin OR member of the agreement).
 */
async function userCanReadBenefit(db: D1Database, benefitId: string, user: { id: string; role: string }): Promise<Record<string, any> | null> {
  const benefit = await findBenefitById(db, benefitId);
  if (!benefit) return null;

  const b = benefit as any;
  if (user.role === 'platform_admin') return benefit;

  // Check union admin
  const membership = await db.prepare(
    `SELECT um.role FROM union_memberships um
     JOIN collective_agreements ca ON ca.union_id = um.union_id
     WHERE um.user_id = ? AND ca.id = ?`
  ).bind(user.id, b.agreement_id).first<{ role: string }>();
  if (membership?.role === 'admin') return benefit;

  // Check member access via member_agreements
  const memberAccess = await db.prepare(
    'SELECT id FROM member_agreements WHERE user_id = ? AND agreement_id = ?'
  ).bind(user.id, b.agreement_id).first();
  if (memberAccess) return benefit;

  return null;
}

/**
 * Check if user has admin access to a benefit's agreement union.
 */
async function userCanWriteBenefit(db: D1Database, benefitId: string, user: { id: string; role: string }): Promise<Record<string, any> | null> {
  const benefit = await findBenefitById(db, benefitId);
  if (!benefit) return null;

  const b = benefit as any;
  if (user.role === 'platform_admin') return benefit;

  const membership = await db.prepare(
    `SELECT um.role FROM union_memberships um
     JOIN collective_agreements ca ON ca.union_id = um.union_id
     WHERE um.user_id = ? AND ca.id = ?`
  ).bind(user.id, b.agreement_id).first<{ role: string }>();
  if (membership?.role === 'admin') return benefit;

  return null;
}

// List benefits for an agreement (union admin only)
benefits.get('/agreement/:agreementId', async (c) => {
  const user = c.get('user')!;
  const agreementId = c.req.param('agreementId');
  if (!(await requireAgreementAdmin(c.env.DB, agreementId, user))) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const result = await findBenefitsByAgreementId(c.env.DB, agreementId);
  return c.json({ data: result });
});

// Create benefit (union admin only)
benefits.post('/agreement/:agreementId',
  zValidator('json', benefitSchema),
  async (c) => {
    const user = c.get('user')!;
    const agreementId = c.req.param('agreementId');
    if (!(await requireAgreementAdmin(c.env.DB, agreementId, user))) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const data = c.req.valid('json');
    const benefit = await createBenefit(c.env.DB, {
      agreement_id: agreementId,
      ...data,
      limit_amount: data.limit_amount ?? null,
    });
    return c.json({ data: benefit }, 201);
  }
);

// Get single benefit by ID (admin or member with access)
benefits.get('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const benefit = await userCanReadBenefit(c.env.DB, id, user);
  if (!benefit) return c.json({ error: 'Benefit not found' }, 404);
  return c.json({ data: benefit });
});

// Update benefit (union admin only)
benefits.put('/:id',
  zValidator('json', benefitSchema.partial()),
  async (c) => {
    const user = c.get('user')!;
    const benefit = await userCanWriteBenefit(c.env.DB, c.req.param('id'), user);
    if (!benefit) return c.json({ error: 'Benefit not found' }, 404);
    const data = c.req.valid('json');
    const updated = await updateBenefit(c.env.DB, c.req.param('id'), data);
    return c.json({ data: updated });
  }
);

// Delete benefit (union admin only)
benefits.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const benefit = await userCanWriteBenefit(c.env.DB, c.req.param('id'), user);
  if (!benefit) return c.json({ error: 'Benefit not found' }, 404);
  await deleteBenefit(c.env.DB, c.req.param('id'));
  return c.json({ success: true });
});

// Reorder benefits (union admin only)
benefits.put('/agreement/:agreementId/reorder',
  zValidator('json', z.object({
    items: z.array(z.object({
      id: z.string(),
      sort_order: z.number().int().min(0),
    })),
  })),
  async (c) => {
    const user = c.get('user')!;
    const agreementId = c.req.param('agreementId');
    if (!(await requireAgreementAdmin(c.env.DB, agreementId, user))) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { items } = c.req.valid('json');
    await reorderBenefits(c.env.DB, items);
    const result = await findBenefitsByAgreementId(c.env.DB, agreementId);
    return c.json({ data: result });
  }
);

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

export default benefits;
