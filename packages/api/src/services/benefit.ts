export async function createBenefit(db: D1Database, data: {
  agreement_id: string;
  name: string;
  description?: string;
  category: string;
  unit_type: string;
  limit_amount?: number | null;
  period: string;
  eligibility_notes?: string;
  clause_text?: string;
  plain_english?: string;
  claim_process?: string;
  clause_reference?: string;
}) {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);

  // Get the next sort order
  const maxOrder = await db.prepare(
    'SELECT MAX(sort_order) as max_order FROM benefits WHERE agreement_id = ?'
  ).bind(data.agreement_id).first<{ max_order: number | null }>();
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  await db.prepare(`
    INSERT INTO benefits (id, agreement_id, name, description, category, unit_type, limit_amount, period, eligibility_notes, sort_order, clause_text, plain_english, claim_process, clause_reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, data.agreement_id, data.name, data.description || null,
    data.category, data.unit_type, data.limit_amount ?? null,
    data.period, data.eligibility_notes || null, sortOrder,
    data.clause_text || null, data.plain_english || null,
    data.claim_process || null, data.clause_reference || null
  ).run();

  return findBenefitById(db, id);
}

export async function findBenefitById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM benefits WHERE id = ?').bind(id).first();
}

export async function findBenefitsByAgreementId(db: D1Database, agreementId: string) {
  const result = await db.prepare(
    'SELECT * FROM benefits WHERE agreement_id = ? ORDER BY sort_order ASC'
  ).bind(agreementId).all();
  return result.results;
}

export async function updateBenefit(db: D1Database, id: string, data: {
  name?: string;
  description?: string;
  category?: string;
  unit_type?: string;
  limit_amount?: number | null;
  period?: string;
  eligibility_notes?: string;
  clause_text?: string;
  plain_english?: string;
  claim_process?: string;
  clause_reference?: string;
}) {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
  if (data.unit_type !== undefined) { fields.push('unit_type = ?'); values.push(data.unit_type); }
  if (data.limit_amount !== undefined) { fields.push('limit_amount = ?'); values.push(data.limit_amount); }
  if (data.period !== undefined) { fields.push('period = ?'); values.push(data.period); }
  if (data.eligibility_notes !== undefined) { fields.push('eligibility_notes = ?'); values.push(data.eligibility_notes); }
  if (data.clause_text !== undefined) { fields.push('clause_text = ?'); values.push(data.clause_text); }
  if (data.plain_english !== undefined) { fields.push('plain_english = ?'); values.push(data.plain_english); }
  if (data.claim_process !== undefined) { fields.push('claim_process = ?'); values.push(data.claim_process); }
  if (data.clause_reference !== undefined) { fields.push('clause_reference = ?'); values.push(data.clause_reference); }
  fields.push("updated_at = datetime('now')");
  values.push(id);

  if (fields.length <= 1) return findBenefitById(db, id); // Only updated_at, skip

  await db.prepare(`UPDATE benefits SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  return findBenefitById(db, id);
}

export async function deleteBenefit(db: D1Database, id: string) {
  await db.prepare('DELETE FROM benefits WHERE id = ?').bind(id).run();
}

export async function reorderBenefits(db: D1Database, items: { id: string; sort_order: number }[]) {
  for (const item of items) {
    await db.prepare('UPDATE benefits SET sort_order = ? WHERE id = ?').bind(item.sort_order, item.id).run();
  }
}
