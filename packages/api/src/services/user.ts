import type { AppEnv } from '../types';
import type { Context } from 'hono';

type Db = Context<AppEnv>['env']['DB'];

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export async function findByEmail(db: Db, email: string): Promise<DbUser | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<DbUser>();
  return result;
}

export async function findById(db: Db, id: string): Promise<DbUser | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first<DbUser>();
  return result;
}

export async function upsertByEmail(db: Db, email: string): Promise<DbUser> {
  const existing = await findByEmail(db, email);
  if (existing) return existing;

  const id = crypto.randomUUID().replace(/-/g, '');
  await db
    .prepare('INSERT INTO users (id, email) VALUES (?, ?)')
    .bind(id, email)
    .run();

  const user = await findById(db, id);
  if (!user) throw new Error('Failed to create user');
  return user;
}

export async function updateUser(
  db: Db,
  id: string,
  data: { name?: string; role?: string }
): Promise<DbUser | null> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    sets.push('name = ?');
    values.push(data.name);
  }
  if (data.role !== undefined) {
    sets.push('role = ?');
    values.push(data.role);
  }

  if (sets.length === 0) return findById(db, id);

  sets.push("updated_at = datetime('now')");
  values.push(id);

  await db
    .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return findById(db, id);
}
