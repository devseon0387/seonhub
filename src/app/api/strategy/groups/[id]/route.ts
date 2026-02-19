import { NextResponse } from 'next/server';
import { dbGetGroup, dbDeleteGroup } from '../../_lib';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const group = await dbGetGroup(id);
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(group);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbDeleteGroup(id);
  return NextResponse.json({ ok: true });
}
