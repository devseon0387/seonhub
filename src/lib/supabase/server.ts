import { cookies } from 'next/headers';
import { makeFrom } from './shim-builder';
import { executeSpec, type QuerySpec, type ExecResult } from '@/lib/local-db/execute';
import { verifySession, AUTH_COOKIE, authenticate } from '@/lib/local-db/auth';

const serverExecutor = async (spec: QuerySpec): Promise<ExecResult> => executeSpec(spec);

interface UserLike { id: string; email: string; role: string; name: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown>; }

export async function createClient() {
  const cookieStore = await cookies();

  const auth = {
    async getUser() {
      const token = cookieStore.get(AUTH_COOKIE)?.value;
      const user = await verifySession(token);
      return { data: { user: user as UserLike | null }, error: null };
    },
    async getSession() {
      const { data } = await auth.getUser();
      return { data: { session: data.user ? { user: data.user } : null }, error: null };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const r = await authenticate(email, password);
      if ('error' in r) return { data: { user: null, session: null }, error: { message: r.error } };
      cookieStore.set(AUTH_COOKIE, r.token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
      return { data: { user: r.user as UserLike, session: { user: r.user } }, error: null };
    },
    async signOut() {
      cookieStore.delete(AUTH_COOKIE);
      return { error: null };
    },
  };

  return {
    from: makeFrom(serverExecutor),
    auth,
    rpc: async () => ({ data: null, error: { message: 'RPC not supported' } }),
  };
}
