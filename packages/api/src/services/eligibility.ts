// packages/api/src/services/eligibility.ts

export type Operator = 'gte' | 'lte' | 'eq' | 'neq' | 'contains';

export interface EligibilityRule {
  id: string;
  benefit_id: string;
  key: string;
  operator: Operator;
  value: string;
  label: string;
  updated_at: string;
}

export interface UserAttribute {
  id: string;
  user_id: string;
  key: string;
  value: string;
  updated_at: string;
}

export type EligibilityStatus = true | false | 'unknown';

export interface EligibilityResult {
  eligible: EligibilityStatus;
  unmet_rules: string[];
}

// ── User Attributes ──────────────────────────────────────────────────────────

export async function getUserAttributes(db: D1Database, userId: string): Promise<Record<string, string>> {
  const result = await db.prepare(
    'SELECT key, value FROM user_attributes WHERE user_id = ?'
  ).bind(userId).all<{ key: string; value: string }>();
  const attrs: Record<string, string> = {};
  for (const row of result.results) {
    attrs[row.key] = row.value;
  }
  return attrs;
}

export async function upsertUserAttributes(
  db: D1Database,
  userId: string,
  attrs: Record<string, string>
): Promise<void> {
  for (const [key, value] of Object.entries(attrs)) {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    await db.prepare(`
      INSERT INTO user_attributes (id, user_id, key, value)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).bind(id, userId, key, value).run();
  }
}

// ── Benefit Eligibility Rules ────────────────────────────────────────────────

export async function getRulesForBenefit(db: D1Database, benefitId: string): Promise<EligibilityRule[]> {
  const result = await db.prepare(
    'SELECT * FROM benefit_eligibility_rules WHERE benefit_id = ? ORDER BY updated_at ASC'
  ).bind(benefitId).all<EligibilityRule>();
  return result.results;
}

export async function getRulesForBenefits(db: D1Database, benefitIds: string[]): Promise<Map<string, EligibilityRule[]>> {
  if (benefitIds.length === 0) return new Map();
  const CHUNK_SIZE = 50;
  const map = new Map<string, EligibilityRule[]>();
  for (let i = 0; i < benefitIds.length; i += CHUNK_SIZE) {
    const chunk = benefitIds.slice(i, i + CHUNK_SIZE);
    const placeholders = chunk.map(() => '?').join(',');
    const result = await db.prepare(
      `SELECT * FROM benefit_eligibility_rules WHERE benefit_id IN (${placeholders}) ORDER BY updated_at ASC`
    ).bind(...chunk).all<EligibilityRule>();
    for (const row of result.results) {
      if (!map.has(row.benefit_id)) map.set(row.benefit_id, []);
      map.get(row.benefit_id)!.push(row);
    }
  }
  return map;
}

export async function addEligibilityRule(
  db: D1Database,
  benefitId: string,
  rule: { key: string; operator: Operator; value: string; label: string }
): Promise<EligibilityRule> {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  await db.prepare(`
    INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, benefitId, rule.key, rule.operator, rule.value, rule.label).run();
  const inserted = await db.prepare(
    'SELECT * FROM benefit_eligibility_rules WHERE id = ?'
  ).bind(id).first<EligibilityRule>();
  if (!inserted) throw new Error(`Failed to retrieve eligibility rule after insert (id=${id})`);
  return inserted;
}

export async function deleteEligibilityRule(db: D1Database, ruleId: string, benefitId: string): Promise<void> {
  await db.prepare('DELETE FROM benefit_eligibility_rules WHERE id = ? AND benefit_id = ?').bind(ruleId, benefitId).run();
}

// ── Evaluation ───────────────────────────────────────────────────────────────

/** Compute tenure in complete months from a YYYY-MM-DD start date to today. */
function tenureMonths(startDate: string): number | null {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return null;
  return months;
}

/** Evaluate a single rule against the user's attributes. Returns true/false/'unknown'. */
function evaluateRule(rule: EligibilityRule, attrs: Record<string, string>): true | false | 'unknown' {
  // Special case: tenure_months is derived from start_date
  if (rule.key === 'tenure_months') {
    if (!attrs['start_date']) return 'unknown';
    const actual = tenureMonths(attrs['start_date']);
    if (actual === null) return 'unknown';
    const required = parseFloat(rule.value);
    if (isNaN(required)) return 'unknown';
    if (rule.operator === 'gte') return actual >= required;
    if (rule.operator === 'lte') return actual <= required;
    return 'unknown';
  }

  const userValue = attrs[rule.key];
  if (userValue === undefined || userValue === null || userValue === '') return 'unknown';

  const ruleVal = rule.value.toLowerCase();
  const userVal = userValue.toLowerCase();

  switch (rule.operator) {
    case 'eq':       return userVal === ruleVal;
    case 'neq':      return userVal !== ruleVal;
    case 'contains': return userVal.includes(ruleVal);
    case 'gte': {
      const a = parseFloat(userVal), b = parseFloat(ruleVal);
      return isNaN(a) || isNaN(b) ? 'unknown' : a >= b;
    }
    case 'lte': {
      const a = parseFloat(userVal), b = parseFloat(ruleVal);
      return isNaN(a) || isNaN(b) ? 'unknown' : a <= b;
    }
    default: return 'unknown';
  }
}

/** Evaluate all rules for a benefit. Returns eligible status + labels of failing/unknown rules. */
export function evaluateEligibility(rules: EligibilityRule[], attrs: Record<string, string>): EligibilityResult {
  if (rules.length === 0) return { eligible: true, unmet_rules: [] };

  let anyFail = false;
  let anyUnknown = false;
  const unmet_rules: string[] = [];

  for (const rule of rules) {
    const result = evaluateRule(rule, attrs);
    if (result === false) {
      anyFail = true;
      unmet_rules.push(rule.label);
    } else if (result === 'unknown') {
      anyUnknown = true;
      unmet_rules.push(rule.label);
    }
  }

  const eligible: EligibilityStatus = anyFail ? false : anyUnknown ? 'unknown' : true;
  return { eligible, unmet_rules };
}
