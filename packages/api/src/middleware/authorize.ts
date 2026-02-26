import { Context, Next } from 'hono';
import type { AppEnv } from '../types';

export function requireRole(...roles: string[]) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}

export function requireUnionAdmin(unionIdParam: string = 'unionId') {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Platform admins can access any union
    if (user.role === 'platform_admin') {
      await next();
      return;
    }

    const unionId = c.req.param(unionIdParam);
    if (!unionId) {
      return c.json({ error: 'Union ID required' }, 400);
    }

    const membership = await c.env.DB.prepare(
      'SELECT role FROM union_memberships WHERE user_id = ? AND union_id = ?'
    ).bind(user.id, unionId).first();

    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  };
}
