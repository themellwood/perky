import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { magicLinkRequestSchema, verifyTokenSchema } from '@perky/shared';
import { upsertByEmail, findById } from '../services/user';
import { sendEmail, buildMagicLinkEmail } from '../services/email';
import { requireAuth } from '../middleware/auth';

const auth = new Hono<AppEnv>();

// Request a magic link
auth.post('/magic-link', zValidator('json', magicLinkRequestSchema), async (c) => {
  const { email } = c.req.valid('json');
  const normalizedEmail = email.toLowerCase().trim();

  const token = crypto.randomUUID();

  // Store magic link token in KV with 15-minute TTL
  await c.env.AUTH_KV.put(
    `magic:${token}`,
    JSON.stringify({ email: normalizedEmail }),
    { expirationTtl: 900 }
  );

  // Send email
  const appUrl = c.env.APP_URL || 'http://localhost:5173';

  // In development, log the token instead of sending email
  if (!c.env.RESEND_API_KEY || c.env.RESEND_API_KEY === 'your-resend-api-key-here') {
    console.log(`[DEV] Magic link for ${normalizedEmail}: ${appUrl}/auth/verify?token=${token}`);
  } else {
    const { subject, html } = buildMagicLinkEmail(appUrl, token);
    await sendEmail(c.env.RESEND_API_KEY, { to: normalizedEmail, subject, html });
  }

  return c.json({ success: true });
});

// Verify a magic link token
auth.post('/verify', zValidator('json', verifyTokenSchema), async (c) => {
  const { token } = c.req.valid('json');

  // Look up the magic link token
  const magicData = await c.env.AUTH_KV.get(`magic:${token}`, 'json') as {
    email: string;
  } | null;

  if (!magicData) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Delete the magic link token (single use)
  await c.env.AUTH_KV.delete(`magic:${token}`);

  // Upsert the user
  const user = await upsertByEmail(c.env.DB, magicData.email);

  // Create session token
  const sessionToken = crypto.randomUUID();
  await c.env.AUTH_KV.put(
    `session:${sessionToken}`,
    JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
    }),
    { expirationTtl: 2592000 } // 30 days
  );

  // Set session cookie
  const isProduction = c.env.APP_URL?.startsWith('https');
  const cookie = [
    `perky_session=${sessionToken}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=2592000`,
    isProduction ? 'Secure' : '',
  ].filter(Boolean).join('; ');

  c.header('Set-Cookie', cookie);

  return c.json({ data: user });
});

// Logout
auth.post('/logout', requireAuth, async (c) => {
  // Try Bearer token first, then cookie
  const authHeader = c.req.header('Authorization');
  let sessionToken: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    sessionToken = authHeader.slice(7);
  } else {
    const cookies = c.req.header('Cookie') || '';
    const match = cookies.match(/perky_session=([^;]+)/);
    if (match) sessionToken = match[1];
  }
  if (sessionToken) {
    await c.env.AUTH_KV.delete(`session:${sessionToken}`);
  }

  // Clear cookie
  c.header('Set-Cookie', 'perky_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

  return c.json({ success: true });
});

// Get current user
auth.get('/me', requireAuth, async (c) => {
  const sessionUser = c.get('user');
  if (!sessionUser) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await findById(c.env.DB, sessionUser.id);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ data: user });
});

// Update current user profile
auth.put('/me', requireAuth,
  zValidator('json', z.object({
    name: z.string().trim().min(1).max(100).optional(),
  })),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name } = c.req.valid('json');
    if (name !== undefined) {
      await c.env.DB.prepare(
        "UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(name, sessionUser.id).run();
    }

    const user = await findById(c.env.DB, sessionUser.id);
    return c.json({ data: user });
  }
);

export default auth;
