import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { scanDevProjects, type DevProject } from './scan-projects';

const HOME = process.env.HOME || '/';
const DEV_ROOT = path.join(HOME, 'Desktop/Dev');

const ENV_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.example',
];

export interface LocalhostRef {
  key: string;
  port: number;
}

export interface EnvInfo {
  projectId: string;
  /** 이 프로젝트의 env 키 이름 목록 (값은 포함 안 함) */
  keys: string[];
  /** key → 값 해시(12자 SHA-256). 프로젝트 간 동일 값 감지용. 실제 값은 서버에 남고 클라이언트엔 전송 안 됨. */
  valueHashes: Record<string, string>;
  /** localhost:PORT 참조 — 다른 프로젝트를 가리킬 수 있음 */
  localhostRefs: LocalhostRef[];
}

export interface RelationsData {
  projects: DevProject[];
  env: EnvInfo[];
}

function parseEnvContent(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function hashValue(v: string): string {
  return crypto.createHash('sha256').update(v).digest('hex').slice(0, 12);
}

function extractPort(val: string): number | null {
  // localhost:3000 · 127.0.0.1:3000 · http://localhost:3000/... 등
  const m = val.match(/(?:localhost|127\.0\.0\.1):(\d{2,5})/);
  return m ? parseInt(m[1], 10) : null;
}

async function scanEnvFor(projectPath: string, projectId: string): Promise<EnvInfo> {
  const merged: Record<string, string> = {};
  for (const file of ENV_FILES) {
    try {
      const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
      Object.assign(merged, parseEnvContent(content));
    } catch {
      // 파일 없음 무시
    }
  }
  const keys = Object.keys(merged);
  const valueHashes: Record<string, string> = {};
  const localhostRefs: LocalhostRef[] = [];
  for (const key of keys) {
    const v = merged[key];
    if (!v) continue;
    // 값이 너무 짧으면 해시 무의미 (false positive 많음)
    if (v.length >= 8) valueHashes[key] = hashValue(v);
    const port = extractPort(v);
    if (port) localhostRefs.push({ key, port });
  }
  return { projectId, keys, valueHashes, localhostRefs };
}

// TTL 캐시
const CACHE_TTL_MS = 30_000;
let cached: { at: number; data: RelationsData } | null = null;
let inflight: Promise<RelationsData> | null = null;

async function freshScan(): Promise<RelationsData> {
  const { projects } = await scanDevProjects();
  const env = await Promise.all(projects.map((p) => scanEnvFor(p.absPath, p.id)));
  return { projects, env };
}

export async function scanDevEnvRelations(): Promise<RelationsData> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.data;
  if (inflight) return inflight;
  inflight = freshScan()
    .then((data) => {
      cached = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// 사용 안 함 - 타입 임포트 용도로 path/DEV_ROOT lint 무시
void DEV_ROOT;
