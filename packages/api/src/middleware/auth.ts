import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types';

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const sessionToken = getSessionToken(c);
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const sessionData = await c.env.AUTH_KV.get(`session:${sessionToken}`, 'json') as {
    userId: string;
    email: string;
    role: string;
  } | null;

  if (!sessionData) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Fetch fresh role from D1 (KV may have stale role after admin promotion)
  const freshUser = await c.env.DB.prepare(
    'SELECT role FROM users WHERE id = ?'
  ).bind(sessionData.userId).first<{ role: string }>();

  c.set('user', {
    id: sessionData.userId,
    email: sessionData.email,
    role: freshUser?.role || sessionData.role,
  });

  await next();
});

export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const sessionToken = getSessionToken(c);
  if (sessionToken) {
    const sessionData = await c.env.AUTH_KV.get(`session:${sessionToken}`, 'json') as {
      userId: string;
      email: string;
      role: string;
    } | null;

    if (sessionData) {
      c.set('user', {
        id: sessionData.userId,
        email: sessionData.email,
        role: sessionData.role,
      });
    }
  }

  await next();
});

function getSessionToken(c: any): string | null {
  // Check Authorization header first
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookies = c.req.header('Cookie') || '';
  const match = cookies.match(/perky_session=([^;]+)/);
  return match ? match[1] : null;
}
