import { NextResponse } from 'next/server';
import { type DevProject, FAVICON_CANDIDATES } from '@/lib/dev/scan-projects';
import { getDevProjects } from '@/lib/dev/projects-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type { DevProject };
export { FAVICON_CANDIDATES };

export async function GET() {
  try {
    const result = await getDevProjects();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[dev/projects]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
