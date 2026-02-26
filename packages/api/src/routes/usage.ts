import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { logUsageSchema, usageQuerySchema } from '@perky/shared';
import { logUsage, findUsageLogs, deleteUsageLog, userHasBenefitAccess, getUsageSummary } from '../services/usage';

const usage = new Hono<AppEnv>();

usage.use('*', requireAuth);

// Log usage
usage.post('/',
  zValidator('json', logUsageSchema),
  async (c) => {
    const user = c.get('user')!;
    const data = c.req.valid('json');

    // Verify user has access to this benefit
    const hasAccess = await userHasBenefitAccess(c.env.DB, user.id, data.benefit_id);
    if (!hasAccess) {
      return c.json({ error: 'You do not have access to this benefit' }, 403);
    }

    const usageLog = await logUsage(c.env.DB, {
      user_id: user.id,
      ...data,
    });

    return c.json({ data: usageLog }, 201);
  }
);

// Get usage history
usage.get('/', async (c) => {
  const user = c.get('user')!;
  const benefit_id = c.req.query('benefit_id');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const logs = await findUsageLogs(c.env.DB, user.id, {
    benefit_id: benefit_id || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  return c.json({ data: logs });
});

// Delete a usage log
usage.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');

  try {
    await deleteUsageLog(c.env.DB, id, user.id);
    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete';
    return c.json({ error: message }, 404);
  }
});

// Get usage summary for all member's benefits
usage.get('/summary', async (c) => {
  const user = c.get('user')!;
  const summaries = await getUsageSummary(c.env.DB, user.id);
  return c.json({ data: summaries });
});

export default usage;
