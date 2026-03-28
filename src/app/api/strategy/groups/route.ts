import { NextResponse } from 'next/server';
import { dbGetGroups, dbCreateGroup, requireAuth } from '../_lib';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    const groups = await dbGetGroups();
    return NextResponse.json(groups);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const group = await dbCreateGroup(body);
    return NextResponse.json(group);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
