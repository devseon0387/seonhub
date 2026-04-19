import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE } from '@/lib/local-db/auth';

export async function POST() {
  (await cookies()).delete(AUTH_COOKIE);
  return NextResponse.json({ ok: true });
}
