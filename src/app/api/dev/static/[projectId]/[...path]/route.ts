import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOME = process.env.HOME || '/';
const DEV_ROOT = path.join(HOME, 'Desktop/Dev');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(MIME));
const BLOCKED_DIRS = new Set(['node_modules', '.git', '.next', '.turbo', 'dist', 'build']);

const ABSOLUTE_URL_RE = /^(https?:|\/\/|\/|#|data:|javascript:|mailto:|blob:)/i;

function toStaticUrl(projectId: string, baseDir: string, url: string): string {
  const joined = baseDir ? `${baseDir}/${url}` : url;
  const normalized = path.posix.normalize(joined).replace(/^\/+/, '');
  const encoded = normalized
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  return `/api/dev/static/${encodeURIComponent(projectId)}/${encoded}`;
}

function rewriteHtmlForShadowDom(html: string, baseDir: string, projectId: string): string {
  // 1) src="..." / href="..." 속성 재작성
  let out = html.replace(
    /(\s(?:src|href)\s*=\s*)(["'])([^"']*)\2/gi,
    (_m, prefix: string, quote: string, url: string) => {
      if (!url || ABSOLUTE_URL_RE.test(url)) return `${prefix}${quote}${url}${quote}`;
      return `${prefix}${quote}${toStaticUrl(projectId, baseDir, url)}${quote}`;
    },
  );

  // 2) CSS url(...) 재작성
  out = out.replace(
    /\burl\(\s*(["']?)([^)"']+)\1\s*\)/gi,
    (_m, quote: string, url: string) => {
      if (!url || ABSOLUTE_URL_RE.test(url)) return `url(${quote}${url}${quote})`;
      return `url(${quote}${toStaticUrl(projectId, baseDir, url)}${quote})`;
    },
  );

  // 3) Shadow DOM에선 :root 와 html 선택자가 매칭 안 됨 → :host 로 변환
  //    (선택자 목록 내부의 :root / 단독 html 토큰만 치환)
  out = out.replace(/:root\b/g, ':host');
  out = out.replace(
    /(^|[\s,{])html(\s*[,{])/g,
    (_m, pre: string, post: string) => `${pre}:host${post}`,
  );

  return out;
}

function isSafeSegment(seg: string): boolean {
  if (!seg || seg === '.' || seg === '..') return false;
  if (seg.startsWith('.')) return false; // 숨김 파일 차단
  if (BLOCKED_DIRS.has(seg)) return false;
  return true;
}

/**
 * Dev Workspace 프로젝트의 정적 파일을 안전하게 서빙.
 * 외부 프로젝트의 HTML 목업을 iframe으로 불러올 때 사용.
 *
 * 보안:
 * - DEV_ROOT 바깥 경로는 차단 (path traversal)
 * - node_modules·.git 등 차단
 * - 허용 확장자만 서빙
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; path: string[] }> },
) {
  const { projectId, path: segments } = await params;

  if (!isSafeSegment(projectId)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }
  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: 'No path' }, { status: 400 });
  }
  for (const seg of segments) {
    if (!isSafeSegment(seg)) {
      return NextResponse.json({ error: `Blocked segment: ${seg}` }, { status: 400 });
    }
  }

  const relPath = segments.join('/');
  const ext = path.extname(relPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `Blocked extension: ${ext}` }, { status: 400 });
  }

  const projectRoot = path.join(DEV_ROOT, projectId);
  const fullPath = path.resolve(projectRoot, relPath);

  // path traversal 방지 재검증
  if (!fullPath.startsWith(path.resolve(projectRoot) + path.sep) && fullPath !== path.resolve(projectRoot)) {
    return NextResponse.json({ error: 'Outside project root' }, { status: 400 });
  }

  try {
    const st = await fs.stat(fullPath);
    if (!st.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 404 });
    }
    const buf = await fs.readFile(fullPath);
    const contentType = MIME[ext] ?? 'application/octet-stream';

    // HTML은 Shadow DOM 주입 대비 전처리:
    //  1) 상대 경로 URL(src/href/css url)을 /api/dev/static/... 절대 경로로 치환
    //  2) CSS :root 와 html 선택자를 :host 로 변환 (Shadow DOM에서 CSS 변수 cascade 정상화)
    if (ext === '.html' || ext === '.htm') {
      const html = buf.toString('utf-8');
      const dirPath = path.posix.dirname(relPath);
      const baseDir = dirPath === '.' ? '' : dirPath;

      const rewritten = rewriteHtmlForShadowDom(html, baseDir, projectId);
      return new NextResponse(rewritten, {
        status: 200,
        headers: { 'content-type': contentType, 'cache-control': 'no-store' },
      });
    }

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: { 'content-type': contentType, 'cache-control': 'public, max-age=60' },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[dev/static]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
