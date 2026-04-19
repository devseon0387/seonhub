import { makeFrom } from './shim-builder';
import { executeSpec, type QuerySpec, type ExecResult } from '@/lib/local-db/execute';
import { getDb, decodeRow } from '@/lib/local-db/db';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const executor = async (spec: QuerySpec): Promise<ExecResult> => executeSpec(spec);

interface AuthAdminUser { id: string; email: string; }

function createAdminAuth() {
  return {
    async getUserById(id: string) {
      const db = getDb();
      const row = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      if (!row) return { data: { user: null }, error: { message: 'not found' } };
      const d = decodeRow('user_profiles', row)!;
      return { data: { user: { id: d.id, email: d.email } as AuthAdminUser }, error: null };
    },
    async listUsers() {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM user_profiles').all() as Record<string, unknown>[];
      return { data: { users: rows.map((r) => decodeRow('user_profiles', r)) }, error: null };
    },
    async createUser({ email, password, email_confirm: _ec, user_metadata }: { email: string; password?: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> }) {
      const db = getDb();
      const id = randomUUID();
      const hash = password ? bcrypt.hashSync(password, 10) : null;
      db.prepare(`INSERT INTO user_profiles (id, email, name, role, approved, password_hash) VALUES (?, ?, ?, 'viewer', 0, ?)`)
        .run(id, email, (user_metadata?.name as string) ?? null, hash);
      return { data: { user: { id, email } }, error: null };
    },
    async updateUserById(id: string, payload: { password?: string; email?: string; user_metadata?: Record<string, unknown> }) {
      const db = getDb();
      if (payload.password) {
        db.prepare('UPDATE user_profiles SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(payload.password, 10), id);
      }
      if (payload.email) {
        db.prepare('UPDATE user_profiles SET email = ? WHERE id = ?').run(payload.email, id);
      }
      return { data: { user: { id } }, error: null };
    },
    async deleteUser(id: string) {
      const db = getDb();
      db.prepare('DELETE FROM user_profiles WHERE id = ?').run(id);
      return { data: {}, error: null };
    },
  };
}

export function createClient(_url?: string, _key?: string, _opts?: unknown) {
  return {
    from: makeFrom(executor),
    auth: { admin: createAdminAuth() },
    rpc: async () => ({ data: null, error: { message: 'RPC not supported' } }),
  };
}
