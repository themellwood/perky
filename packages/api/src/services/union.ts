export async function createUnion(db: D1Database, data: { name: string; description?: string; created_by: string }) {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  await db.prepare(
    'INSERT INTO unions (id, name, description, created_by) VALUES (?, ?, ?, ?)'
  ).bind(id, data.name, data.description || null, data.created_by).run();

  return findUnionById(db, id);
}

export async function findUnionById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM unions WHERE id = ?').bind(id).first();
}

export async function findAllUnions(db: D1Database) {
  const result = await db.prepare("SELECT * FROM unions WHERE type = 'standard' ORDER BY created_at DESC").all();
  return result.results;
}

export async function findUnionsByUserId(db: D1Database, userId: string) {
  const result = await db.prepare(`
    SELECT u.* FROM unions u
    INNER JOIN union_memberships um ON u.id = um.union_id
    WHERE um.user_id = ? AND u.type = 'standard'
    ORDER BY u.created_at DESC
  `).bind(userId).all();
  return result.results;
}

export async function updateUnion(db: D1Database, id: string, data: { name?: string; description?: string }) {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.prepare(`UPDATE unions SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  return findUnionById(db, id);
}

export async function addUnionAdmin(db: D1Database, unionId: string, userId: string) {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  await db.prepare(
    'INSERT OR IGNORE INTO union_memberships (id, user_id, union_id, role) VALUES (?, ?, ?, ?)'
  ).bind(id, userId, unionId, 'admin').run();

  // Update user role to union_admin if currently member
  await db.prepare(
    "UPDATE users SET role = 'union_admin', updated_at = datetime('now') WHERE id = ? AND role = 'member'"
  ).bind(userId).run();
}

export async function getUnionMembers(db: D1Database, unionId: string) {
  const result = await db.prepare(`
    SELECT u.id, u.email, u.name, u.role, um.role as union_role, um.created_at as joined_at
    FROM users u
    INNER JOIN union_memberships um ON u.id = um.user_id
    WHERE um.union_id = ?
    ORDER BY um.created_at DESC
  `).bind(unionId).all();
  return result.results;
}
