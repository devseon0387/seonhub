import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, AUTH_COOKIE } from '@/lib/local-db/auth';

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const user = await verifySession(token);
  return NextResponse.json({ user });
}
