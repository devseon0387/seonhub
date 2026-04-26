import { NextResponse } from 'next/server';
import { scanDevProjects, type DevProject, FAVICON_CANDIDATES } from '@/lib/dev/scan-projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type { DevProject };
export { FAVICON_CANDIDATES };

export async function GET() {
  try {
    const result = await scanDevProjects();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[dev/projects]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
