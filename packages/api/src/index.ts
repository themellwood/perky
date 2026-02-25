import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { AppEnv } from './types';
import { rateLimit } from './middleware/rate-limit';
import auth from './routes/auth';
import unions from './routes/unions';
import agreements from './routes/agreements';
import benefits from './routes/benefits';
import member from './routes/member';
import usage from './routes/usage';
import documents from './routes/documents';
import directory from './routes/directory';
import analytics from './routes/analytics';
import selfService from './routes/self-service';
import partners from './routes/partners';
import profile from './routes/profile';

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use('*', cors({
  origin: (origin, c) => {
    if (!origin) return origin; // same-origin or non-browser requests

    // Build allowlist from APP_URL + dev origins
    const allowedOrigins: string[] = [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
    ];

    const appUrl = (c.env as any)?.APP_URL;
    if (appUrl) {
      try {
        const url = new URL(appUrl);
        allowedOrigins.push(url.origin);
      } catch { /* ignore invalid APP_URL */ }
    }

    return allowedOrigins.includes(origin) ? origin : '';
  },
  credentials: true,
}));

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const api = new Hono<AppEnv>();

// Rate limiting: tighter on sensitive auth actions & AI extraction, relaxed on general
api.use('/auth/magic-link', rateLimit({ limit: 5, window: 60, prefix: 'auth-magic' }));
api.use('/auth/verify', rateLimit({ limit: 10, window: 60, prefix: 'auth-verify' }));
api.use('/documents/extract/*', rateLimit({ limit: 3, window: 60, prefix: 'extract' }));
api.use('/self-service/extract/*', rateLimit({ limit: 3, window: 60, prefix: 'extract-self' }));
api.use('/partners/enquiry', rateLimit({ limit: 3, window: 60, prefix: 'partners-enquiry' }));
api.use('*', rateLimit({ limit: 120, window: 60, prefix: 'general' }));

api.route('/auth', auth);
api.route('/unions', unions);
api.route('/agreements', agreements);
api.route('/benefits', benefits);
api.route('/member', member);
api.route('/usage', usage);
api.route('/documents', documents);
api.route('/directory', directory);
api.route('/analytics', analytics);
api.route('/self-service', selfService);
api.route('/partners', partners);
api.route('/profile', profile);

app.route('/api', api);

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  const status = 'status' in err ? (err as any).status : 500;
  const message = err.message || 'Internal server error';
  return c.json({ error: message }, status);
});

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
