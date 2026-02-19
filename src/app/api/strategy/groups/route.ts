import { NextResponse } from 'next/server';
import { dbGetGroups, dbCreateGroup } from '../_lib';

export async function GET() {
  const groups = await dbGetGroups();
  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  const body = await req.json();
  const group = await dbCreateGroup(body);
  return NextResponse.json(group);
}
