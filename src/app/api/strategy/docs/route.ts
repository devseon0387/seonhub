import { NextResponse } from 'next/server';
import { dbGetDocs, dbCreateDoc, requireAuth } from '../_lib';

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId') ?? undefined;
    const docs = await dbGetDocs(groupId);
    return NextResponse.json(docs);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const doc = await dbCreateDoc(body);
    return NextResponse.json(doc);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
