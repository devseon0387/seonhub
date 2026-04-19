import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOME = process.env.HOME || '/';
const DEV_ROOT = path.join(HOME, 'Desktop/Dev');

export interface DevProject {
  id: string;
  name: string;
  path: string;           // ~ 축약
  absPath: string;        // 절대경로
  description: string | null;
  techStack: string[];
  devPort: number | null;
  isRunning: boolean;
  lastModified: number;
  gitBranch: string | null;
  hasGit: boolean;
  hasPackageJson: boolean;
  hasDesignSystem: boolean;    // src/design/ 또는 design/ 폴더 존재
  hasWireframes: boolean;      // src/wireframes/ 또는 wireframes/ 폴더 존재
  hasRoadmap: boolean;         // src/roadmap/ 또는 roadmap/ 폴더 존재
  hasERD: boolean;             // src/erd/ 또는 erd/ 폴더 존재
  faviconUrl: string | null;   // /api/dev/favicon/[id] 있으면, 없으면 null
}

// 프로젝트 루트 기준 favicon 후보 경로 (우선순위 순)
export const FAVICON_CANDIDATES = [
  'public/favicon.ico',
  'public/favicon.png',
  'public/icon.png',
  'public/logo.png',
  'public/logo.svg',
  'app/icon.png',
  'app/icon.svg',
  'app/icon.ico',
  'app/favicon.ico',
  'src/app/icon.png',
  'src/app/icon.svg',
  'src/app/favicon.ico',
];

interface PackageJson {
  name?: string;
  description?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function homeAbbreviate(p: string): string {
  const home = process.env.HOME || '';
  return home && p.startsWith(home) ? '~' + p.slice(home.length) : p;
}

function detectPort(scripts: Record<string, string> | undefined): number | null {
  if (!scripts?.dev) return null;
  const match = scripts.dev.match(/-p\s+(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function detectTechStack(projectPath: string, pkg: PackageJson | null, extraFiles: { [k: string]: boolean }): string[] {
  const stack: string[] = [];
  const deps: Record<string, string> = {
    ...(pkg?.dependencies || {}),
    ...(pkg?.devDependencies || {}),
  };

  // JavaScript frameworks (순서 중요 — 더 구체적인 것 먼저)
  if (deps['next']) {
    const major = (deps['next'].replace(/[^\d.]/g, '').split('.')[0]) || '';
    stack.push(`Next.js${major ? ` ${major}` : ''}`);
  } else if (deps['@nestjs/core']) {
    stack.push('NestJS');
  } else if (deps['react']) {
    stack.push('React');
  } else if (deps['express']) {
    stack.push('Express');
  } else if (deps['vite']) {
    stack.push('Vite');
  } else if (pkg) {
    stack.push('Node.js');
  }

  if (deps['typescript']) stack.push('TS');
  if (deps['tailwindcss']) stack.push('Tailwind');
  if (deps['dexie']) stack.push('Dexie');
  if (deps['@supabase/supabase-js']) stack.push('Supabase');
  if (deps['prisma'] || deps['@prisma/client']) stack.push('Prisma');
  if (deps['better-sqlite3']) stack.push('SQLite');

  // Python
  if (extraFiles.pythonReq || extraFiles.pyproject) stack.push('Python');
  if (extraFiles.flaskFound) stack.push('Flask');

  // C++
  if (extraFiles.cmake) stack.push('C++');
  if (extraFiles.cargo) stack.push('Rust');
  if (extraFiles.goMod) stack.push('Go');
  if (extraFiles.tauriConf) stack.push('Tauri');

  return stack;
}

async function checkFile(dirPath: string, name: string): Promise<boolean> {
  try {
    await fs.access(path.join(dirPath, name));
    return true;
  } catch {
    return false;
  }
}

async function hasFolder(projectPath: string, rels: string[]): Promise<boolean> {
  for (const rel of rels) {
    try {
      const st = await fs.stat(path.join(projectPath, rel));
      if (st.isDirectory()) return true;
    } catch {}
  }
  return false;
}

async function hasDesignFolder(projectPath: string): Promise<boolean> {
  return hasFolder(projectPath, ['src/design', 'design']);
}

async function hasWireframesFolder(projectPath: string): Promise<boolean> {
  return hasFolder(projectPath, ['src/wireframes', 'wireframes']);
}

async function hasRoadmapFolder(projectPath: string): Promise<boolean> {
  return hasFolder(projectPath, ['src/roadmap', 'roadmap']);
}

async function hasERDFolder(projectPath: string): Promise<boolean> {
  return hasFolder(projectPath, ['src/erd', 'erd']);
}

async function getGitBranch(projectPath: string): Promise<string | null> {
  try {
    const out = execSync(`git -C "${projectPath}" branch --show-current 2>/dev/null`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}

function isPortListening(port: number): boolean {
  try {
    execSync(`lsof -iTCP:${port} -sTCP:LISTEN -P -t 2>/dev/null`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

async function scanOne(projectPath: string, name: string): Promise<DevProject | null> {
  try {
    const stat = await fs.stat(projectPath);
    if (!stat.isDirectory()) return null;

    let pkg: PackageJson | null = null;
    try {
      const raw = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8');
      pkg = JSON.parse(raw);
    } catch {}

    const [pythonReq, pyproject, cmake, cargo, goMod, tauriConf, hasGit] = await Promise.all([
      checkFile(projectPath, 'requirements.txt'),
      checkFile(projectPath, 'pyproject.toml'),
      checkFile(projectPath, 'CMakeLists.txt'),
      checkFile(projectPath, 'Cargo.toml'),
      checkFile(projectPath, 'go.mod'),
      checkFile(projectPath, 'src-tauri/tauri.conf.json'),
      checkFile(projectPath, '.git'),
    ]);

    const flaskFound = pythonReq
      ? await fs
          .readFile(path.join(projectPath, 'requirements.txt'), 'utf-8')
          .then((c) => /^flask/mi.test(c))
          .catch(() => false)
      : false;

    const techStack = detectTechStack(projectPath, pkg, {
      pythonReq,
      pyproject,
      cmake,
      cargo,
      goMod,
      tauriConf,
      flaskFound,
    });

    const devPort = detectPort(pkg?.scripts);
    const isRunning = devPort ? isPortListening(devPort) : false;
    const gitBranch = hasGit ? await getGitBranch(projectPath) : null;
    const hasDesignSystem = await hasDesignFolder(projectPath);
    const hasWireframes = await hasWireframesFolder(projectPath);
    const hasRoadmap = await hasRoadmapFolder(projectPath);
    const hasERD = await hasERDFolder(projectPath);

    // Favicon 후보 경로 중 존재하는 첫 번째 찾기
    let faviconUrl: string | null = null;
    for (const rel of FAVICON_CANDIDATES) {
      if (await checkFile(projectPath, rel)) {
        faviconUrl = `/api/dev/favicon/${encodeURIComponent(name)}`;
        break;
      }
    }

    return {
      id: name,
      name: pkg?.name || name,
      path: homeAbbreviate(projectPath),
      absPath: projectPath,
      description: pkg?.description?.trim() || null,
      techStack,
      devPort,
      isRunning,
      lastModified: stat.mtimeMs,
      gitBranch,
      hasGit,
      hasPackageJson: !!pkg,
      hasDesignSystem,
      hasWireframes,
      hasRoadmap,
      hasERD,
      faviconUrl,
    };
  } catch (err) {
    console.error(`[dev/projects] scan failed for ${name}`, err);
    return null;
  }
}

export async function GET() {
  try {
    const entries = await fs.readdir(DEV_ROOT, { withFileTypes: true });
    const dirs = entries.filter(
      (e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules',
    );
    const scans = await Promise.all(
      dirs.map((d) => scanOne(path.join(DEV_ROOT, d.name), d.name)),
    );
    const projects = scans
      .filter((p): p is DevProject => p !== null)
      .sort((a, b) => b.lastModified - a.lastModified);

    return NextResponse.json({
      root: homeAbbreviate(DEV_ROOT),
      count: projects.length,
      projects,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[dev/projects]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
