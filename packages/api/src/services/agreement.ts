export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (const byte of array) {
    code += chars[byte % chars.length];
  }
  return code;
}

export async function createAgreement(db: D1Database, data: {
  union_id: string;
  title: string;
  uploaded_by: string;
}) {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  const accessCode = generateAccessCode();

  await db.prepare(
    'INSERT INTO collective_agreements (id, union_id, title, access_code, uploaded_by) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, data.union_id, data.title, accessCode, data.uploaded_by).run();

  return findAgreementById(db, id);
}

export async function findAgreementById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM collective_agreements WHERE id = ?').bind(id).first();
}

export async function findAgreementsByUnionId(db: D1Database, unionId: string) {
  const result = await db.prepare(
    'SELECT * FROM collective_agreements WHERE union_id = ? ORDER BY created_at DESC'
  ).bind(unionId).all();
  return result.results;
}

export async function findAgreementByAccessCode(db: D1Database, accessCode: string) {
  return db.prepare(
    'SELECT * FROM collective_agreements WHERE access_code = ? AND status IN (?, ?)'
  ).bind(accessCode, 'published', 'public_approved').first();
}

export async function updateAgreement(db: D1Database, id: string, data: { title?: string; status?: string; document_url?: string }) {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.document_url !== undefined) { fields.push('document_url = ?'); values.push(data.document_url || null); }
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.prepare(`UPDATE collective_agreements SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  return findAgreementById(db, id);
}

export async function publishAgreement(db: D1Database, id: string) {
  // Check it has at least one benefit
  const benefitCount = await db.prepare(
    'SELECT COUNT(*) as count FROM benefits WHERE agreement_id = ?'
  ).bind(id).first<{ count: number }>();

  if (!benefitCount || benefitCount.count === 0) {
    throw new Error('Cannot publish an agreement with no benefits');
  }

  return updateAgreement(db, id, { status: 'published' });
}
