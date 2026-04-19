import { getDb, encodeRow, decodeRow } from './db';
import { randomUUID } from 'crypto';

export type Filter =
  | { op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is'; col: string; val: unknown }
  | { op: 'in'; col: string; val: unknown[] }
  | { op: 'or'; raw: string }
  | { op: 'not'; col: string; operator: string; val: unknown };

export interface QuerySpec {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  columns?: string;
  filters?: Filter[];
  order?: { col: string; ascending: boolean };
  limit?: number;
  offset?: number;
  single?: boolean;
  maybeSingle?: boolean;
  values?: Record<string, unknown> | Record<string, unknown>[];
  onConflict?: string;
  returning?: boolean;
}

export interface ExecResult {
  data: unknown;
  error: { message: string; code?: string; details?: string; hint?: string } | null;
}

function buildWhere(filters: Filter[] = []): { sql: string; params: unknown[] } {
  if (filters.length === 0) return { sql: '', params: [] };
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const f of filters) {
    if (f.op === 'eq') { parts.push(`"${f.col}" = ?`); params.push(f.val); }
    else if (f.op === 'neq') { parts.push(`"${f.col}" != ?`); params.push(f.val); }
    else if (f.op === 'gt') { parts.push(`"${f.col}" > ?`); params.push(f.val); }
    else if (f.op === 'gte') { parts.push(`"${f.col}" >= ?`); params.push(f.val); }
    else if (f.op === 'lt') { parts.push(`"${f.col}" < ?`); params.push(f.val); }
    else if (f.op === 'lte') { parts.push(`"${f.col}" <= ?`); params.push(f.val); }
    else if (f.op === 'like' || f.op === 'ilike') { parts.push(`"${f.col}" LIKE ?`); params.push(f.val); }
    else if (f.op === 'is') {
      if (f.val === null) parts.push(`"${f.col}" IS NULL`);
      else parts.push(`"${f.col}" IS ?`), params.push(f.val);
    }
    else if (f.op === 'in') {
      if (f.val.length === 0) { parts.push('0'); }
      else { parts.push(`"${f.col}" IN (${f.val.map(() => '?').join(',')})`); params.push(...f.val); }
    }
    else if (f.op === 'or') { parts.push(`(${f.raw})`); }
  }
  return { sql: parts.length ? ' WHERE ' + parts.join(' AND ') : '', params };
}

export function executeSpec(spec: QuerySpec): ExecResult {
  try {
    const db = getDb();
    const t = spec.table;

    if (spec.action === 'select') {
      const where = buildWhere(spec.filters);
      let sql = `SELECT ${spec.columns || '*'} FROM "${t}"${where.sql}`;
      if (spec.order) sql += ` ORDER BY "${spec.order.col}" ${spec.order.ascending ? 'ASC' : 'DESC'}`;
      if (spec.limit !== undefined) sql += ` LIMIT ${spec.limit}`;
      if (spec.offset !== undefined) sql += ` OFFSET ${spec.offset}`;
      const rows = db.prepare(sql).all(...where.params) as Record<string, unknown>[];
      const decoded = rows.map((r) => decodeRow(t, r));
      if (spec.single) {
        if (decoded.length === 0) return { data: null, error: { message: 'No rows', code: 'PGRST116' } };
        if (decoded.length > 1) return { data: null, error: { message: 'Multiple rows', code: 'PGRST116' } };
        return { data: decoded[0], error: null };
      }
      if (spec.maybeSingle) {
        return { data: decoded[0] ?? null, error: null };
      }
      return { data: decoded, error: null };
    }

    if (spec.action === 'insert' || spec.action === 'upsert') {
      const items = Array.isArray(spec.values) ? spec.values : [spec.values!];
      const inserted: unknown[] = [];
      const insertOne = (raw: Record<string, unknown>) => {
        if (!raw.id) raw.id = randomUUID();
        if (t !== 'trash' && !raw.created_at) raw.created_at = new Date().toISOString();
        const row = encodeRow(t, raw);
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(',');
        const values = cols.map((c) => row[c]);
        const quoted = cols.map((c) => `"${c}"`).join(',');
        let sql: string;
        if (spec.action === 'upsert') {
          const conflict = spec.onConflict || 'id';
          const updateClause = cols
            .filter((c) => c !== conflict)
            .map((c) => `"${c}" = excluded."${c}"`)
            .join(', ');
          sql = `INSERT INTO "${t}" (${quoted}) VALUES (${placeholders}) ON CONFLICT("${conflict}") DO UPDATE SET ${updateClause || `"${conflict}" = excluded."${conflict}"`}`;
        } else {
          sql = `INSERT INTO "${t}" (${quoted}) VALUES (${placeholders})`;
        }
        db.prepare(sql).run(...values);
        const back = db.prepare(`SELECT * FROM "${t}" WHERE "id" = ?`).get(raw.id) as Record<string, unknown>;
        inserted.push(decodeRow(t, back));
      };
      for (const item of items) insertOne(item as Record<string, unknown>);
      if (spec.single) return { data: inserted[0], error: null };
      return { data: inserted, error: null };
    }

    if (spec.action === 'update') {
      const raw = spec.values as Record<string, unknown>;
      const row = encodeRow(t, raw);
      const cols = Object.keys(row);
      if (cols.length === 0) return { data: null, error: { message: 'No fields to update' } };
      const setClause = cols.map((c) => `"${c}" = ?`).join(', ');
      const where = buildWhere(spec.filters);
      const sql = `UPDATE "${t}" SET ${setClause}${where.sql}`;
      const values = cols.map((c) => row[c]);
      db.prepare(sql).run(...values, ...where.params);
      if (spec.returning) {
        const selectSql = `SELECT * FROM "${t}"${where.sql}`;
        const rows = db.prepare(selectSql).all(...where.params) as Record<string, unknown>[];
        const decoded = rows.map((r) => decodeRow(t, r));
        if (spec.single) return { data: decoded[0] ?? null, error: null };
        return { data: decoded, error: null };
      }
      return { data: null, error: null };
    }

    if (spec.action === 'delete') {
      const where = buildWhere(spec.filters);
      const sql = `DELETE FROM "${t}"${where.sql}`;
      db.prepare(sql).run(...where.params);
      return { data: null, error: null };
    }

    return { data: null, error: { message: 'Unsupported action' } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { data: null, error: { message: msg } };
  }
}
