import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { optionalAuth } from '../middleware/auth';

const directory = new Hono<AppEnv>();

// Public directory - list all publicly approved agreements
directory.get('/', optionalAuth, async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT
      ca.id, ca.title, ca.access_code, ca.status, ca.created_at,
      u.name as union_name, u.description as union_description,
      COUNT(b.id) as benefit_count
    FROM collective_agreements ca
    JOIN unions u ON ca.union_id = u.id
    LEFT JOIN benefits b ON ca.id = b.agreement_id
    WHERE ca.status = 'public_approved' AND u.type = 'standard'
    GROUP BY ca.id
    ORDER BY u.name ASC, ca.title ASC
  `).all();

  return c.json({ data: result.results });
});

// Get public agreement detail with benefits (for preview before joining)
directory.get('/:id', optionalAuth, async (c) => {
  const id = c.req.param('id');

  const agreement = await c.env.DB.prepare(`
    SELECT
      ca.id, ca.title, ca.access_code, ca.status, ca.created_at,
      u.name as union_name, u.description as union_description
    FROM collective_agreements ca
    JOIN unions u ON ca.union_id = u.id
    WHERE ca.id = ? AND ca.status = 'public_approved' AND u.type = 'standard'
  `).bind(id).first();

  if (!agreement) return c.json({ error: 'Agreement not found' }, 404);

  const benefits = await c.env.DB.prepare(`
    SELECT id, name, description, category, unit_type, limit_amount, period, eligibility_notes
    FROM benefits
    WHERE agreement_id = ?
    ORDER BY sort_order ASC
  `).bind(id).all();

  return c.json({
    data: {
      ...agreement,
      benefits: benefits.results,
    }
  });
});

export default directory;
