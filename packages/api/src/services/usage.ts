import { getRulesForBenefits, getUserAttributes, evaluateEligibility, type EligibilityStatus } from './eligibility';

export async function logUsage(db: D1Database, data: {
  user_id: string;
  benefit_id: string;
  amount: number;
  used_on: string;
  note?: string;
}) {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);

  await db.prepare(
    'INSERT INTO usage_logs (id, user_id, benefit_id, amount, used_on, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, data.user_id, data.benefit_id, data.amount, data.used_on, data.note || null).run();

  return findUsageById(db, id);
}

export async function findUsageById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM usage_logs WHERE id = ?').bind(id).first();
}

export async function findUsageLogs(db: D1Database, userId: string, filters?: {
  benefit_id?: string;
  from?: string;
  to?: string;
}) {
  let query = 'SELECT ul.*, b.name as benefit_name, b.unit_type, b.category FROM usage_logs ul JOIN benefits b ON ul.benefit_id = b.id WHERE ul.user_id = ?';
  const params: any[] = [userId];

  if (filters?.benefit_id) {
    query += ' AND ul.benefit_id = ?';
    params.push(filters.benefit_id);
  }
  if (filters?.from) {
    query += ' AND ul.used_on >= ?';
    params.push(filters.from);
  }
  if (filters?.to) {
    query += ' AND ul.used_on <= ?';
    params.push(filters.to);
  }

  query += ' ORDER BY ul.used_on DESC, ul.created_at DESC';

  const result = await db.prepare(query).bind(...params).all();
  return result.results;
}

export async function deleteUsageLog(db: D1Database, id: string, userId: string) {
  const log = await db.prepare(
    'SELECT * FROM usage_logs WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!log) {
    throw new Error('Usage log not found or not yours');
  }

  await db.prepare('DELETE FROM usage_logs WHERE id = ?').bind(id).run();
  return log;
}

export async function userHasBenefitAccess(db: D1Database, userId: string, benefitId: string) {
  const result = await db.prepare(`
    SELECT b.id FROM benefits b
    JOIN member_agreements ma ON b.agreement_id = ma.agreement_id
    WHERE b.id = ? AND ma.user_id = ?
  `).bind(benefitId, userId).first();
  return !!result;
}

interface UsageSummary {
  benefit_id: string;
  benefit_name: string;
  benefit_description: string | null;
  category: string;
  unit_type: string;
  limit_amount: number | null;
  period: string;
  eligibility_notes: string | null;
  clause_text: string | null;
  plain_english: string | null;
  claim_process: string | null;
  clause_reference: string | null;
  total_used: number;
  remaining: number | null;
  agreement_id: string;
  agreement_title: string;
  eligible: EligibilityStatus;
  unmet_rules: string[];
}

export async function getUsageSummary(db: D1Database, userId: string): Promise<UsageSummary[]> {
  // Get all benefits the user has access to
  const benefits = await db.prepare(`
    SELECT b.*, ca.title as agreement_title
    FROM benefits b
    JOIN member_agreements ma ON b.agreement_id = ma.agreement_id
    JOIN collective_agreements ca ON b.agreement_id = ca.id
    WHERE ma.user_id = ?
    ORDER BY ca.title ASC, b.sort_order ASC
  `).bind(userId).all();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const summaries: Omit<UsageSummary, 'eligible' | 'unmet_rules'>[] = [];

  for (const benefit of benefits.results) {
    const b = benefit as any;
    let dateFilter = '';
    const params: any[] = [b.id, userId];

    if (b.period === 'per_month') {
      // Current calendar month
      const monthStart = `${year}-${month}-01`;
      const nextMonth = now.getMonth() === 11 ? `${year + 1}-01-01` : `${year}-${String(now.getMonth() + 2).padStart(2, '0')}-01`;
      dateFilter = ' AND ul.used_on >= ? AND ul.used_on < ?';
      params.push(monthStart, nextMonth);
    } else if (b.period === 'per_year') {
      // Current calendar year
      dateFilter = ' AND ul.used_on >= ? AND ul.used_on < ?';
      params.push(`${year}-01-01`, `${year + 1}-01-01`);
    }
    // per_occurrence and unlimited: sum all time (no date filter)

    const usageResult = await db.prepare(`
      SELECT COALESCE(SUM(ul.amount), 0) as total_used
      FROM usage_logs ul
      WHERE ul.benefit_id = ? AND ul.user_id = ?${dateFilter}
    `).bind(...params).first<{ total_used: number }>();

    const totalUsed = usageResult?.total_used ?? 0;

    summaries.push({
      benefit_id: b.id,
      benefit_name: b.name,
      benefit_description: b.description,
      category: b.category,
      unit_type: b.unit_type,
      limit_amount: b.limit_amount,
      period: b.period,
      eligibility_notes: b.eligibility_notes,
      clause_text: b.clause_text ?? null,
      plain_english: b.plain_english ?? null,
      claim_process: b.claim_process ?? null,
      clause_reference: b.clause_reference ?? null,
      total_used: totalUsed,
      remaining: b.limit_amount !== null ? Math.max(0, b.limit_amount - totalUsed) : null,
      agreement_id: b.agreement_id,
      agreement_title: b.agreement_title,
    });
  }

  // Load eligibility data
  const benefitIds = summaries.map((s) => s.benefit_id);
  const rulesMap = await getRulesForBenefits(db, benefitIds);
  const userAttrs = await getUserAttributes(db, userId);

  // Annotate each summary with eligibility result
  return summaries.map((s) => {
    const rules = rulesMap.get(s.benefit_id) ?? [];
    const { eligible, unmet_rules } = evaluateEligibility(rules, userAttrs);
    return { ...s, eligible, unmet_rules };
  });
}
