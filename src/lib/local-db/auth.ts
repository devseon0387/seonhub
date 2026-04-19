import bcrypt from 'bcryptjs';
import { getDb, decodeRow } from './db';
import { signSession, type SessionUser } from './session';

export { AUTH_COOKIE, verifySession, signSession, type SessionUser } from './session';

export async function authenticate(email: string, password: string): Promise<{ user: SessionUser; token: string } | { error: string }> {
  const db = getDb();
  const row = db.prepare('SELECT * FROM user_profiles WHERE email = ?').get(email) as Record<string, unknown> | undefined;
  if (!row) return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  const decoded = decodeRow('user_profiles', row)!;
  const hash = decoded.password_hash as string | null;
  if (!hash) return { error: '비밀번호가 설정되지 않았습니다.' };
  const ok = await bcrypt.compare(password, hash);
  if (!ok) return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  if (decoded.role !== 'admin' && !decoded.approved) return { error: '관리자 승인 대기 중입니다.' };

  const user: SessionUser = {
    id: String(decoded.id),
    email: String(decoded.email),
    role: String(decoded.role),
    name: (decoded.name as string | null) ?? null,
  };
  const token = await signSession(user);
  return { user, token };
}
