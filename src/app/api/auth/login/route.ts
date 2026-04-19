import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authenticate, AUTH_COOKIE } from '@/lib/local-db/auth';

export async function POST(req: Request) {
  const { email, password } = (await req.json()) as { email: string; password: string };
  const result = await authenticate(email, password);
  if ('error' in result) {
    return NextResponse.json({ error: { message: result.error } }, { status: 401 });
  }
  (await cookies()).set(AUTH_COOKIE, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ user: result.user });
}
