import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

declare global {
  var __hype5_db: Database.Database | undefined;
}

const DB_PATH = process.env.HYPE5_DB_PATH || join(process.cwd(), 'hype5.db');

export function getDb(): Database.Database {
  if (global.__hype5_db) return global.__hype5_db;

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = join(process.cwd(), 'src/lib/local-db/schema.sql');
  const schema = readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  runMigrations(db);
  seedIfEmpty(db);

  global.__hype5_db = db;
  return db;
}

function runMigrations(db: Database.Database) {
  const safe = (sql: string) => {
    try { db.exec(sql); } catch {}
  };
  safe(`ALTER TABLE expenses ADD COLUMN currency TEXT DEFAULT 'KRW'`);
  safe(`ALTER TABLE projects ADD COLUMN type TEXT DEFAULT 'video'`);
  safe(`ALTER TABLE projects ADD COLUMN meta TEXT`);
  safe(`CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    sprint_number INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planning',
    start_date TEXT,
    end_date TEXT,
    goal TEXT,
    issue_count INTEGER DEFAULT 0,
    completed_issue_count INTEGER DEFAULT 0,
    assignee_ids TEXT,
    budget_total REAL DEFAULT 0,
    budget_partner REAL DEFAULT 0,
    budget_management REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  safe(`CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id)`);
  safe(`CREATE TABLE IF NOT EXISTS content_items (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    item_number INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    platform TEXT DEFAULT 'other',
    content_kind TEXT,
    publish_date TEXT,
    published_at TEXT,
    published_url TEXT,
    view_count INTEGER DEFAULT 0,
    assignee_ids TEXT,
    budget_total REAL DEFAULT 0,
    budget_partner REAL DEFAULT 0,
    budget_management REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  safe(`CREATE INDEX IF NOT EXISTS idx_content_items_project ON content_items(project_id)`);
}

function seedIfEmpty(db: Database.Database) {
  const row = db.prepare('SELECT COUNT(*) AS c FROM user_profiles').get() as { c: number };
  if (row.c > 0) return;

  const id = randomUUID();
  const passwordHash = bcrypt.hashSync('!Are100412', 10);
  db.prepare(`
    INSERT INTO user_profiles (id, email, name, role, approved, password_hash, needs_password_change)
    VALUES (?, ?, ?, ?, 1, ?, 0)
  `).run(id, 'test@gmail.com', 'Test Admin', 'admin', passwordHash);

  console.log('[local-db] seeded admin user: test@gmail.com');
}

// 컬럼 중 JSON/배열로 저장되는 것들. 저장 시 stringify, 조회 시 parse.
const JSON_COLUMNS: Record<string, Set<string>> = {
  projects: new Set(['partner_ids', 'manager_ids', 'channels', 'work_content', 'tags', 'work_type_costs', 'meta']),
  episodes: new Set(['work_content', 'work_items', 'work_steps', 'work_budgets']),
  sprints: new Set(['assignee_ids']),
  content_items: new Set(['assignee_ids']),
  portfolio_items: new Set(['tags']),
  inquiries: new Set(['references_links', 'portfolio_references']),
  trash: new Set(['data']),
  sent_emails: new Set(['to', 'cc', 'bcc']),
  user_profiles: new Set(['tutorial_done']),
  checklists: new Set(['repeat_days']),
  app_updates: new Set(['tags']),
};

const BOOL_COLUMNS: Record<string, Set<string>> = {
  user_profiles: new Set(['approved', 'needs_password_change']),
  checklists: new Set(['completed', 'notified']),
  portfolio_items: new Set(['is_published']),
  strategy_docs: new Set(['pinned']),
};

export function encodeRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const jsonCols = JSON_COLUMNS[table] ?? new Set();
  const boolCols = BOOL_COLUMNS[table] ?? new Set();
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    if (jsonCols.has(k)) {
      out[k] = v === null ? null : JSON.stringify(v);
    } else if (boolCols.has(k)) {
      out[k] = v === null ? null : (v ? 1 : 0);
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (typeof v === 'object' && v !== null) {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function decodeRow(table: string, row: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  const jsonCols = JSON_COLUMNS[table] ?? new Set();
  const boolCols = BOOL_COLUMNS[table] ?? new Set();
  for (const [k, v] of Object.entries(row)) {
    if (jsonCols.has(k) && typeof v === 'string') {
      try { out[k] = JSON.parse(v); } catch { out[k] = v; }
    } else if (boolCols.has(k)) {
      out[k] = v === 1 || v === true;
    } else {
      out[k] = v;
    }
  }
  return out;
}
