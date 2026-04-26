#!/usr/bin/env -S npx tsx
/**
 * MacBook → Supabase Dev Workspace 동기화.
 *
 * launchd가 주기적으로 호출. ~/Desktop/Dev 스캔 결과를 dev_projects 테이블에 upsert,
 * dev_sync_meta에 마지막 sync 시각/개수/호스트 기록.
 *
 * 사용:
 *   tsx scripts/sync-dev-projects.ts
 *   npm run sync:dev
 *
 * 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local에서 자동 로드)
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import os from 'os';

// .env.local 로드 (dotenv/config는 .env만 읽음)
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // .env.local 없어도 OK (외부 env로 주어진 경우)
}

import { createClient } from '@supabase/supabase-js';
import { promises as fsp } from 'fs';
import path from 'path';
import { scanDevProjects, type DevProject, FAVICON_CANDIDATES } from '../src/lib/dev/scan-projects';

async function faviconDataUrl(absPath: string): Promise<string | null> {
  for (const rel of FAVICON_CANDIDATES) {
    const full = path.join(absPath, rel);
    try {
      const buf = await fsp.readFile(full);
      if (buf.length > 200_000) continue; // 200KB 초과 스킵 (DB 부담)
      const ext = (rel.toLowerCase().split('.').pop() || '').replace(/[^a-z]/g, '');
      const mime =
        ext === 'svg' ? 'image/svg+xml' :
        ext === 'ico' ? 'image/x-icon' :
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        ext === 'webp' ? 'image/webp' :
        'image/png';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch { continue; }
  }
  return null;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function toRow(p: DevProject) {
  // Vercel에서도 보이도록 favicon을 base64 data URL로 인라인 (없으면 null)
  const faviconData = p.faviconUrl ? await faviconDataUrl(p.absPath) : null;
  return {
    id: p.id,
    name: p.name,
    path: p.path,
    abs_path: p.absPath,
    description: p.description,
    tech_stack: JSON.stringify(p.techStack ?? []),
    dev_port: p.devPort,
    is_running: p.isRunning ? 1 : 0,
    last_modified: Math.floor(p.lastModified ?? 0),
    git_branch: p.gitBranch,
    has_git: p.hasGit ? 1 : 0,
    has_package_json: p.hasPackageJson ? 1 : 0,
    has_design_system: p.hasDesignSystem ? 1 : 0,
    has_wireframes: p.hasWireframes ? 1 : 0,
    has_roadmap: p.hasRoadmap ? 1 : 0,
    has_erd: p.hasERD ? 1 : 0,
    favicon_url: faviconData ?? p.faviconUrl,
    detected_services: p.detectedServices ? JSON.stringify(p.detectedServices) : null,
    git_dirty: p.gitDirty,
    git_ahead: p.gitAhead,
    git_behind: p.gitBehind,
    synced_at: new Date().toISOString(),
  };
}

async function main() {
  const started = Date.now();
  console.log('[sync-dev] scanning ~/Desktop/Dev …');
  const result = await scanDevProjects();
  const projects = result.projects;
  console.log(`[sync-dev] found ${projects.length} projects in ${Date.now() - started}ms`);

  const rows = await Promise.all(projects.map(toRow));
  if (rows.length === 0) {
    console.warn('[sync-dev] no projects found, skipping upsert');
    return;
  }

  // 1. upsert 모든 프로젝트
  const { error: upErr } = await sb.from('dev_projects').upsert(rows, { onConflict: 'id' });
  if (upErr) {
    console.error('[sync-dev] upsert failed:', upErr.message);
    process.exit(1);
  }

  // 2. 사라진 프로젝트 정리: 현재 스캔에 없는 id 삭제
  const ids = rows.map((r) => r.id);
  const { error: delErr } = await sb.from('dev_projects').delete().not('id', 'in', `(${ids.map((i) => `"${i}"`).join(',')})`);
  if (delErr) console.warn('[sync-dev] stale cleanup warning:', delErr.message);

  // 3. 메타 업데이트
  const { error: metaErr } = await sb
    .from('dev_sync_meta')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_count: rows.length,
      last_sync_host: os.hostname(),
    })
    .eq('id', 1);
  if (metaErr) console.warn('[sync-dev] meta update warning:', metaErr.message);

  console.log(`[sync-dev] ✓ ${rows.length} projects synced (${Date.now() - started}ms)`);
}

main().catch((e) => {
  console.error('[sync-dev] fatal:', e);
  process.exit(1);
});
