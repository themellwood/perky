import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { createBenefit, findBenefitById, findBenefitsByAgreementId, updateBenefit, deleteBenefit, reorderBenefits } from '../services/benefit';

const benefits = new Hono<AppEnv>();

benefits.use('*', requireAuth);

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

// List benefits for an agreement
benefits.get('/agreement/:agreementId', async (c) => {
  const result = await findBenefitsByAgreementId(c.env.DB, c.req.param('agreementId'));
  return c.json({ data: result });
});

// Create benefit
benefits.post('/agreement/:agreementId',
  zValidator('json', benefitSchema),
  async (c) => {
    const data = c.req.valid('json');
    const benefit = await createBenefit(c.env.DB, {
      agreement_id: c.req.param('agreementId'),
      ...data,
      limit_amount: data.limit_amount ?? null,
    });
    return c.json({ data: benefit }, 201);
  }
);

// Get single benefit by ID
benefits.get('/:id', async (c) => {
  const id = c.req.param('id');
  const benefit = await findBenefitById(c.env.DB, id);
  if (!benefit) return c.json({ error: 'Benefit not found' }, 404);
  return c.json({ data: benefit });
});

// Update benefit
benefits.put('/:id',
  zValidator('json', benefitSchema.partial()),
  async (c) => {
    const data = c.req.valid('json');
    const benefit = await updateBenefit(c.env.DB, c.req.param('id'), data);
    return c.json({ data: benefit });
  }
);

// Delete benefit
benefits.delete('/:id', async (c) => {
  await deleteBenefit(c.env.DB, c.req.param('id'));
  return c.json({ success: true });
});

// Reorder benefits
benefits.put('/agreement/:agreementId/reorder',
  zValidator('json', z.object({
    items: z.array(z.object({
      id: z.string(),
      sort_order: z.number().int().min(0),
    })),
  })),
  async (c) => {
    const { items } = c.req.valid('json');
    await reorderBenefits(c.env.DB, items);
    const result = await findBenefitsByAgreementId(c.env.DB, c.req.param('agreementId'));
    return c.json({ data: result });
  }
);

export default benefits;
