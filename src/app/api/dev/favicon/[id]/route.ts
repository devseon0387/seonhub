import fs from 'fs/promises';
import path from 'path';
import { FAVICON_CANDIDATES } from '@/app/api/dev/projects/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEV_ROOT = path.join(process.env.HOME || '/', 'Desktop/Dev');

async function findProjectPath(id: string): Promise<string | null> {
  const devPath = path.join(DEV_ROOT, id);
  try {
    const st = await fs.stat(devPath);
    if (st.isDirectory()) return devPath;
  } catch {}
  return null;
}

function mimeFor(abs: string): string {
  const ext = abs.toLowerCase().split('.').pop();
  if (ext === 'png') return 'image/png';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'ico') return 'image/x-icon';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  // 경로 traversal 방지: 영숫자·하이픈·언더스코어·점만 허용
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
    return new Response('Invalid id', { status: 400 });
  }

  const projectPath = await findProjectPath(id);
  if (!projectPath) {
    return new Response('Project not found', { status: 404 });
  }

  // 후보 순회하며 첫 발견 파일 반환
  for (const rel of FAVICON_CANDIDATES) {
    const abs = path.join(projectPath, rel);
    try {
      const buf = await fs.readFile(abs);
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': mimeFor(abs),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch {
      // 다음 후보
    }
  }

  return new Response('No favicon found', { status: 404 });
}
