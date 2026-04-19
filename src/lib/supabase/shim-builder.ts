import type { QuerySpec, Filter, ExecResult } from '@/lib/local-db/execute';

export type Executor = (spec: QuerySpec) => Promise<ExecResult>;

class QueryBuilder<T = unknown> implements PromiseLike<ExecResult> {
  private spec: QuerySpec;
  constructor(private executor: Executor, table: string, action: QuerySpec['action'] = 'select') {
    this.spec = { table, action, filters: [] };
  }

  select(columns: string = '*'): QueryBuilder<T> {
    this.spec.columns = columns;
    if (this.spec.action === 'insert' || this.spec.action === 'update' || this.spec.action === 'upsert') {
      this.spec.returning = true;
    }
    return this;
  }

  private addFilter(f: Filter) {
    this.spec.filters = this.spec.filters || [];
    this.spec.filters.push(f);
    return this;
  }

  eq(col: string, val: unknown) { return this.addFilter({ op: 'eq', col, val }); }
  neq(col: string, val: unknown) { return this.addFilter({ op: 'neq', col, val }); }
  gt(col: string, val: unknown) { return this.addFilter({ op: 'gt', col, val }); }
  gte(col: string, val: unknown) { return this.addFilter({ op: 'gte', col, val }); }
  lt(col: string, val: unknown) { return this.addFilter({ op: 'lt', col, val }); }
  lte(col: string, val: unknown) { return this.addFilter({ op: 'lte', col, val }); }
  like(col: string, val: unknown) { return this.addFilter({ op: 'like', col, val }); }
  ilike(col: string, val: unknown) { return this.addFilter({ op: 'ilike', col, val }); }
  is(col: string, val: unknown) { return this.addFilter({ op: 'is', col, val }); }
  in(col: string, val: unknown[]) { return this.addFilter({ op: 'in', col, val }); }
  or(raw: string) { return this.addFilter({ op: 'or', raw }); }
  not(col: string, operator: string, val: unknown) { return this.addFilter({ op: 'not', col, operator, val }); }
  contains() { return this; }
  filter() { return this; }
  match(obj: Record<string, unknown>) {
    for (const [k, v] of Object.entries(obj)) this.eq(k, v);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.spec.order = { col, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) { this.spec.limit = n; return this; }
  range(from: number, to: number) {
    this.spec.offset = from;
    this.spec.limit = to - from + 1;
    return this;
  }
  single() { this.spec.single = true; return this as unknown as PromiseLike<ExecResult>; }
  maybeSingle() { this.spec.maybeSingle = true; return this as unknown as PromiseLike<ExecResult>; }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): QueryBuilder<T> {
    this.spec.action = 'insert';
    this.spec.values = values;
    return this;
  }
  update(values: Record<string, unknown>): QueryBuilder<T> {
    this.spec.action = 'update';
    this.spec.values = values;
    return this;
  }
  delete(): QueryBuilder<T> {
    this.spec.action = 'delete';
    return this;
  }
  upsert(values: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }): QueryBuilder<T> {
    this.spec.action = 'upsert';
    this.spec.values = values;
    this.spec.onConflict = opts?.onConflict;
    return this;
  }

  then<TR1 = ExecResult, TR2 = never>(
    onFulfilled?: ((value: ExecResult) => TR1 | PromiseLike<TR1>) | null,
    onRejected?: ((reason: unknown) => TR2 | PromiseLike<TR2>) | null
  ): PromiseLike<TR1 | TR2> {
    return this.executor(this.spec).then(onFulfilled ?? undefined, onRejected ?? undefined);
  }
}

export function makeFrom(executor: Executor) {
  return (table: string) => new QueryBuilder(executor, table);
}
