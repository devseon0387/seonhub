'use client';

import { makeFrom } from './shim-builder';
import type { QuerySpec, ExecResult } from '@/lib/local-db/execute';

const browserExecutor = async (spec: QuerySpec): Promise<ExecResult> => {
  const res = await fetch('/api/local-db', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(spec),
    credentials: 'include',
  });
  if (!res.ok && res.status !== 400) {
    const text = await res.text().catch(() => '');
    return { data: null, error: { message: text || `HTTP ${res.status}` } };
  }
  return (await res.json()) as ExecResult;
};

interface UserLike { id: string; email: string; role: string; name: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown>; }

const auth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    const body = await res.json();
    if (!res.ok) return { data: { user: null, session: null }, error: { message: body?.error?.message || '로그인 실패' } };
    return { data: { user: body.user as UserLike, session: { user: body.user } }, error: null };
  },
  async signOut() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    return { error: null };
  },
  async getUser() {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const body = await res.json();
    return { data: { user: body.user as UserLike | null }, error: null };
  },
  async getSession() {
    const { data } = await this.getUser();
    return { data: { session: data.user ? { user: data.user } : null }, error: null };
  },
  onAuthStateChange(_cb: (event: string, session: unknown) => void) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  async updateUser() {
    return { data: { user: null }, error: { message: 'Not supported in local mode' } };
  },
};

function makeChannel(_name: string) {
  const ch = {
    on(..._args: unknown[]) { return ch; },
    subscribe(_cb?: (status: string) => void) { return ch; },
    unsubscribe() { return Promise.resolve('ok'); },
  };
  return ch;
}

export function createClient() {
  return {
    from: makeFrom(browserExecutor),
    auth,
    channel: makeChannel,
    removeChannel: (_ch: unknown) => Promise.resolve('ok'),
    rpc: async () => ({ data: null, error: { message: 'RPC not supported' } }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: 'Storage not supported' } }),
        download: async () => ({ data: null, error: { message: 'Storage not supported' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
}
