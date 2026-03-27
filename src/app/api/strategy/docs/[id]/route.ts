import { NextResponse } from 'next/server';
import { dbGetDoc, dbUpdateDoc, dbDeleteDoc, requireAuth } from '../../_lib';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const doc = await dbGetDoc(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const body = await req.json();
  const doc = await dbUpdateDoc(id, body);
  return NextResponse.json(doc);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  await dbDeleteDoc(id);
  return NextResponse.json({ ok: true });
}
