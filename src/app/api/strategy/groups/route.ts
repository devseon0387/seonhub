import { NextResponse } from 'next/server';
import { dbGetGroups, dbCreateGroup, requireAuth } from '../_lib';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const groups = await dbGetGroups();
  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const group = await dbCreateGroup(body);
  return NextResponse.json(group);
}
