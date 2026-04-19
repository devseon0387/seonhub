import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { executeSpec, type QuerySpec } from '@/lib/local-db/execute';
import { verifySession, AUTH_COOKIE } from '@/lib/local-db/auth';

export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const user = await verifySession(token);
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const spec = (await req.json()) as QuerySpec;
    const result = executeSpec(spec);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ data: null, error: { message: msg } }, { status: 500 });
  }
}
