import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.HYPE5_JWT_SECRET || 'hype5-local-dev-secret-change-me'
);
export const AUTH_COOKIE = 'h5_session';

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  name: string | null;
}

export async function signSession(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET);
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: String(payload.id),
      email: String(payload.email),
      role: String(payload.role),
      name: (payload.name as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
