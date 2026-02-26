import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { requireRole, requireUnionAdmin } from '../middleware/authorize';
import { createUnion, findAllUnions, findUnionById, findUnionsByUserId, updateUnion, addUnionAdmin, getUnionMembers } from '../services/union';
import { findByEmail, upsertByEmail } from '../services/user';

const unions = new Hono<AppEnv>();

// All routes require auth
unions.use('*', requireAuth);

// List unions
unions.get('/', async (c) => {
  const user = c.get('user')!;

  let result;
  if (user.role === 'platform_admin') {
    result = await findAllUnions(c.env.DB);
  } else {
    result = await findUnionsByUserId(c.env.DB, user.id);
  }

  return c.json({ data: result });
});

// Create union (platform admin only)
unions.post('/',
  requireRole('platform_admin'),
  zValidator('json', z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
  })),
  async (c) => {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const union = await createUnion(c.env.DB, { ...data, created_by: user.id });
    return c.json({ data: union }, 201);
  }
);

// Get union detail
unions.get('/:unionId', async (c) => {
  const union = await findUnionById(c.env.DB, c.req.param('unionId'));
  if (!union) return c.json({ error: 'Union not found' }, 404);
  return c.json({ data: union });
});

// Update union
unions.put('/:unionId',
  requireUnionAdmin('unionId'),
  zValidator('json', z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
  })),
  async (c) => {
    const data = c.req.valid('json');
    const union = await updateUnion(c.env.DB, c.req.param('unionId'), data);
    return c.json({ data: union });
  }
);

// Assign union admin (platform admin only)
unions.post('/:unionId/admins',
  requireRole('platform_admin'),
  zValidator('json', z.object({
    email: z.string().email(),
  })),
  async (c) => {
    const { email } = c.req.valid('json');
    const unionId = c.req.param('unionId');

    // Ensure union exists
    const union = await findUnionById(c.env.DB, unionId);
    if (!union) return c.json({ error: 'Union not found' }, 404);

    // Upsert user by email (creates if new)
    const user = await upsertByEmail(c.env.DB, email.toLowerCase().trim());

    await addUnionAdmin(c.env.DB, unionId, user.id);

    return c.json({ data: { message: `${email} is now an admin of this union` } });
  }
);

// Get union members
unions.get('/:unionId/members',
  requireUnionAdmin('unionId'),
  async (c) => {
    const members = await getUnionMembers(c.env.DB, c.req.param('unionId'));
    return c.json({ data: members });
  }
);

export default unions;
