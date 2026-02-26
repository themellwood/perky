import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { requireAuth } from '../middleware/auth';
import { requireUnionAdmin } from '../middleware/authorize';

const analytics = new Hono<AppEnv>();

analytics.use('*', requireAuth);

// Get aggregate usage analytics for a union
analytics.get('/union/:unionId',
  requireUnionAdmin('unionId'),
  async (c) => {
    const unionId = c.req.param('unionId');

    // Total members count
    const memberCount = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT ma.user_id) as count
      FROM member_agreements ma
      JOIN collective_agreements ca ON ma.agreement_id = ca.id
      WHERE ca.union_id = ?
    `).bind(unionId).first<{ count: number }>();

    // Agreement count
    const agreementCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM collective_agreements WHERE union_id = ?'
    ).bind(unionId).first<{ count: number }>();

    // Aggregate usage by benefit (current month + year)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthStart = `${year}-${month}-01`;
    const yearStart = `${year}-01-01`;

    const benefitUsage = await c.env.DB.prepare(`
      SELECT
        b.id as benefit_id,
        b.name as benefit_name,
        b.category,
        b.unit_type,
        b.limit_amount,
        b.period,
        ca.title as agreement_title,
        COUNT(DISTINCT ma.user_id) as total_members,
        COUNT(DISTINCT CASE WHEN ul.id IS NOT NULL THEN ul.user_id END) as members_using,
        COALESCE(SUM(CASE WHEN ul.used_on >= ? THEN ul.amount ELSE 0 END), 0) as usage_this_month,
        COALESCE(SUM(CASE WHEN ul.used_on >= ? THEN ul.amount ELSE 0 END), 0) as usage_this_year,
        COALESCE(SUM(ul.amount), 0) as usage_all_time
      FROM benefits b
      JOIN collective_agreements ca ON b.agreement_id = ca.id
      LEFT JOIN member_agreements ma ON ca.id = ma.agreement_id
      LEFT JOIN usage_logs ul ON b.id = ul.benefit_id AND ul.user_id = ma.user_id
      WHERE ca.union_id = ?
      GROUP BY b.id
      ORDER BY ca.title ASC, b.sort_order ASC
    `).bind(monthStart, yearStart, unionId).all();

    // Recent activity (last 20 usage logs across all members)
    const recentActivity = await c.env.DB.prepare(`
      SELECT
        ul.amount, ul.used_on, ul.created_at,
        b.name as benefit_name, b.unit_type,
        ca.title as agreement_title
      FROM usage_logs ul
      JOIN benefits b ON ul.benefit_id = b.id
      JOIN collective_agreements ca ON b.agreement_id = ca.id
      WHERE ca.union_id = ?
      ORDER BY ul.created_at DESC
      LIMIT 20
    `).bind(unionId).all();

    return c.json({
      data: {
        summary: {
          total_members: memberCount?.count || 0,
          total_agreements: agreementCount?.count || 0,
        },
        benefit_usage: benefitUsage.results,
        recent_activity: recentActivity.results,
      },
    });
  }
);

export default analytics;
