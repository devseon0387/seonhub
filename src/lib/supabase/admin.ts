import { makeFrom } from './shim-builder';
import { executeSpec, type QuerySpec, type ExecResult } from '@/lib/local-db/execute';
import { getSupabase, decodeRow } from '@/lib/local-db/db';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const executor = async (spec: QuerySpec): Promise<ExecResult> => executeSpec(spec);

interface AuthAdminUser { id: string; email: string; }

function createAdminAuth() {
  return {
    async getUserById(id: string) {
      const sb = getSupabase();
      const { data, error } = await sb.from('user_profiles').select('*').eq('id', id).maybeSingle();
      if (error) return { data: { user: null }, error: { message: error.message } };
      if (!data) return { data: { user: null }, error: { message: 'not found' } };
      const d = decodeRow('user_profiles', data as Record<string, unknown>)!;
      return { data: { user: { id: d.id as string, email: d.email as string } as AuthAdminUser }, error: null };
    },
    async listUsers() {
      const sb = getSupabase();
      const { data, error } = await sb.from('user_profiles').select('*');
      if (error) return { data: { users: [] }, error: { message: error.message } };
      const users = (data ?? []).map((r) => decodeRow('user_profiles', r as Record<string, unknown>));
      return { data: { users }, error: null };
    },
    async createUser({ email, password, email_confirm: _ec, user_metadata }: { email: string; password?: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> }) {
      const sb = getSupabase();
      const id = randomUUID();
      const hash = password ? bcrypt.hashSync(password, 10) : null;
      const { error } = await sb.from('user_profiles').insert({
        id,
        email,
        name: (user_metadata?.name as string) ?? null,
        role: 'viewer',
        approved: 0,
        password_hash: hash,
      });
      if (error) return { data: { user: null }, error: { message: error.message } };
      return { data: { user: { id, email } }, error: null };
    },
    async updateUserById(id: string, payload: { password?: string; email?: string; user_metadata?: Record<string, unknown> }) {
      const sb = getSupabase();
      const patch: Record<string, unknown> = {};
      if (payload.password) patch.password_hash = bcrypt.hashSync(payload.password, 10);
      if (payload.email) patch.email = payload.email;
      if (Object.keys(patch).length > 0) {
        const { error } = await sb.from('user_profiles').update(patch).eq('id', id);
        if (error) return { data: { user: null }, error: { message: error.message } };
      }
      return { data: { user: { id } }, error: null };
    },
    async deleteUser(id: string) {
      const sb = getSupabase();
      const { error } = await sb.from('user_profiles').delete().eq('id', id);
      if (error) return { data: {}, error: { message: error.message } };
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
