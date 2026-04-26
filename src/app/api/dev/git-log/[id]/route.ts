import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOME = process.env.HOME || '/';
const DEV_ROOT = path.join(HOME, 'Desktop/Dev');

interface Commit {
  hash: string;
  author: string;
  subject: string;
  relativeDate: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || id.includes('..') || id.startsWith('.')) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  const projectPath = path.join(DEV_ROOT, id);
  if (!path.resolve(projectPath).startsWith(path.resolve(DEV_ROOT))) {
    return NextResponse.json({ error: 'Outside DEV_ROOT' }, { status: 400 });
  }

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', projectPath, 'log', '-5', '--format=%h|%an|%s|%ar'],
      { timeout: 3000, maxBuffer: 256 * 1024 },
    );
    const commits: Commit[] = stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, author, subject, relativeDate] = line.split('|');
        return { hash: hash ?? '', author: author ?? '', subject: subject ?? '', relativeDate: relativeDate ?? '' };
      });
    return NextResponse.json({ commits });
  } catch (err) {
    return NextResponse.json({ commits: [], error: err instanceof Error ? err.message : 'git failed' });
  }
}
