import { getSupabase, encodeRow, decodeRow } from './db';
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

type AnyBuilder = {
  eq: (col: string, val: unknown) => AnyBuilder;
  neq: (col: string, val: unknown) => AnyBuilder;
  gt: (col: string, val: unknown) => AnyBuilder;
  gte: (col: string, val: unknown) => AnyBuilder;
  lt: (col: string, val: unknown) => AnyBuilder;
  lte: (col: string, val: unknown) => AnyBuilder;
  like: (col: string, val: unknown) => AnyBuilder;
  ilike: (col: string, val: unknown) => AnyBuilder;
  is: (col: string, val: unknown) => AnyBuilder;
  in: (col: string, val: unknown[]) => AnyBuilder;
  not: (col: string, op: string, val: unknown) => AnyBuilder;
  or: (raw: string) => AnyBuilder;
};

function applyFilters<B extends AnyBuilder>(builder: B, filters: Filter[] = []): B {
  let b = builder;
  for (const f of filters) {
    if (f.op === 'eq') b = b.eq(f.col, f.val) as B;
    else if (f.op === 'neq') b = b.neq(f.col, f.val) as B;
    else if (f.op === 'gt') b = b.gt(f.col, f.val) as B;
    else if (f.op === 'gte') b = b.gte(f.col, f.val) as B;
    else if (f.op === 'lt') b = b.lt(f.col, f.val) as B;
    else if (f.op === 'lte') b = b.lte(f.col, f.val) as B;
    else if (f.op === 'like') b = b.like(f.col, f.val) as B;
    else if (f.op === 'ilike') b = b.ilike(f.col, f.val) as B;
    else if (f.op === 'is') b = b.is(f.col, f.val) as B;
    else if (f.op === 'in') b = b.in(f.col, f.val) as B;
    else if (f.op === 'or') b = b.or(f.raw) as B;
    else if (f.op === 'not') b = b.not(f.col, f.op, f.val) as B;
  }
  return b;
}

function decodeMany(table: string, data: unknown): unknown[] {
  if (!Array.isArray(data)) return [];
  return data.map((r) => decodeRow(table, r as Record<string, unknown>));
}

export async function executeSpec(spec: QuerySpec): Promise<ExecResult> {
  try {
    const sb = getSupabase();
    const t = spec.table;

    if (spec.action === 'select') {
      let q = sb.from(t).select(spec.columns || '*') as unknown as AnyBuilder & {
        order: (col: string, opts: { ascending: boolean }) => AnyBuilder & { range: (a: number, b: number) => unknown; limit: (n: number) => unknown; single: () => Promise<{ data: unknown; error: unknown }>; maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
        range: (a: number, b: number) => unknown;
        limit: (n: number) => unknown;
        single: () => Promise<{ data: unknown; error: unknown }>;
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
      q = applyFilters(q, spec.filters);
      if (spec.order) q = q.order(spec.order.col, { ascending: spec.order.ascending }) as typeof q;
      if (spec.offset !== undefined && spec.limit !== undefined) {
        q = q.range(spec.offset, spec.offset + spec.limit - 1) as typeof q;
      } else if (spec.limit !== undefined) {
        q = q.limit(spec.limit) as typeof q;
      }
      if (spec.single) {
        const { data, error } = await q.single();
        if (error) return { data: null, error: error as ExecResult['error'] };
        return { data: decodeRow(t, data as Record<string, unknown>), error: null };
      }
      if (spec.maybeSingle) {
        const { data, error } = await q.maybeSingle();
        if (error) return { data: null, error: error as ExecResult['error'] };
        return { data: data ? decodeRow(t, data as Record<string, unknown>) : null, error: null };
      }
      const { data, error } = await (q as unknown as Promise<{ data: unknown; error: unknown }>);
      if (error) return { data: null, error: error as ExecResult['error'] };
      return { data: decodeMany(t, data), error: null };
    }

    if (spec.action === 'insert' || spec.action === 'upsert') {
      const items = Array.isArray(spec.values) ? spec.values : [spec.values!];
      const encoded = items.map((raw) => {
        const r = { ...(raw as Record<string, unknown>) };
        if (!r.id) r.id = randomUUID();
        if (t !== 'trash' && !r.created_at) r.created_at = new Date().toISOString();
        return encodeRow(t, r);
      });
      let builder;
      if (spec.action === 'upsert') {
        builder = sb.from(t).upsert(encoded, spec.onConflict ? { onConflict: spec.onConflict } : undefined).select();
      } else {
        builder = sb.from(t).insert(encoded).select();
      }
      const { data, error } = await builder;
      if (error) return { data: null, error: error as ExecResult['error'] };
      const decoded = decodeMany(t, data);
      if (spec.single) return { data: decoded[0] ?? null, error: null };
      return { data: decoded, error: null };
    }

    if (spec.action === 'update') {
      const raw = spec.values as Record<string, unknown>;
      const encoded = encodeRow(t, raw);
      let q = sb.from(t).update(encoded) as unknown as AnyBuilder;
      q = applyFilters(q, spec.filters);
      if (spec.returning) {
        const { data, error } = await (q as unknown as { select: () => Promise<{ data: unknown; error: unknown }> }).select();
        if (error) return { data: null, error: error as ExecResult['error'] };
        const decoded = decodeMany(t, data);
        if (spec.single) return { data: decoded[0] ?? null, error: null };
        return { data: decoded, error: null };
      }
      const { error } = await (q as unknown as Promise<{ error: unknown }>);
      if (error) return { data: null, error: error as ExecResult['error'] };
      return { data: null, error: null };
    }

    if (spec.action === 'delete') {
      let q = sb.from(t).delete() as unknown as AnyBuilder;
      q = applyFilters(q, spec.filters);
      const { error } = await (q as unknown as Promise<{ error: unknown }>);
      if (error) return { data: null, error: error as ExecResult['error'] };
      return { data: null, error: null };
    }

    return { data: null, error: { message: 'Unsupported action' } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { data: null, error: { message: msg } };
  }
}
