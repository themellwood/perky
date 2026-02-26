import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types';

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Time window in seconds */
  window: number;
  /** Key prefix to namespace different rate limiters */
  prefix: string;
}

export function rateLimit(opts: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const { limit, window, prefix } = opts;
    const kv = c.env.AUTH_KV;

    const ip =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('x-forwarded-for') ||
      '127.0.0.1';

    const windowKey = Math.floor(Date.now() / (window * 1000));
    const key = `rl:${prefix}:${ip}:${windowKey}`;

    const current = await kv.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limit) {
      const windowStart = windowKey * window;
      const windowEnd = windowStart + window;
      const now = Math.floor(Date.now() / 1000);
      const retryAfter = Math.max(windowEnd - now, 1);

      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'Too many requests', retryAfter }, 429);
    }

    await kv.put(key, String(count + 1), { expirationTtl: window });

    await next();
  });
}
