import { NextResponse } from 'next/server';
import { dbGetGroup, dbUpdateGroup, dbDeleteGroup, requireAuth } from '../../_lib';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const group = await dbGetGroup(id);
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(group);
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const body = await req.json();
  const group = await dbUpdateGroup(id, body);
  return NextResponse.json(group);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  await dbDeleteGroup(id);
  return NextResponse.json({ ok: true });
}
