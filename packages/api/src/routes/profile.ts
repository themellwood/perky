// packages/api/src/routes/profile.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { getUserAttributes, upsertUserAttributes } from '../services/eligibility';

const profile = new Hono<AppEnv>();

profile.use('*', requireAuth);

// Get current user's attributes
profile.get('/attributes', async (c) => {
  const user = c.get('user')!;
  const attrs = await getUserAttributes(c.env.DB, user.id);
  return c.json({ data: attrs });
});

// Upsert user attributes
profile.put('/attributes',
  zValidator('json', z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    employment_type: z.enum(['full_time', 'part_time', 'casual', 'permanent', 'fixed_term']).optional(),
    job_title: z.string().max(200).optional(),
  }).passthrough()), // passthrough allows unknown keys for future extensibility
  async (c) => {
    const user = c.get('user')!;
    const body = c.req.valid('json');
    // Filter out undefined values
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null) attrs[k] = String(v);
    }
    await upsertUserAttributes(c.env.DB, user.id, attrs);
    const updated = await getUserAttributes(c.env.DB, user.id);
    return c.json({ data: updated });
  }
);

export default profile;
