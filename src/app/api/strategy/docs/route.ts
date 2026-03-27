import { NextResponse } from 'next/server';
import { dbGetDocs, dbCreateDoc, requireAuth } from '../_lib';

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId') ?? undefined;
  const docs = await dbGetDocs(groupId);
  return NextResponse.json(docs);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const doc = await dbCreateDoc(body);
  return NextResponse.json(doc);
}
