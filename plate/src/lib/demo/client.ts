'use client';
// Demo mode only (NEXT_PUBLIC_DEMO=1): a tiny stand-in for the Supabase client that keeps
// every table in this browser's localStorage. It implements just the query-builder calls
// the app uses (select/insert/update/upsert/delete, eq/gte/lte/neq, order/limit/range,
// single/maybeSingle, rpc). There is no login and no sync in demo mode.
import catalog from '../../../data/catalog.json';
import { seedDemo } from './seed';

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

const KEY = 'plate-demo-v1';
export const DEMO_USER = { id: '00000000-0000-4000-8000-000000000001', email: 'demo@biiwow.local' };

let db: Tables | null = null;
let clock = 0;
export const now = () => new Date(Date.now() + clock++).toISOString();
export const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));

const PROFILE_DEFAULTS = {
  display_name: 'Demo', timezone: 'UTC', dashboard_nutrients: ['protein_g', 'fiber_g', 'fluid_ml'],
  diet: [], allergies: [], avoid_ingredients: [], liked_foods: [],
};
const DEFAULTS: Record<string, Row> = {
  diary_entries: { status: 'planned', position: 0, tags: [], allergens: [], food_id: null, catalog_id: null, meal_id: null, brand: null, state: null,
    source: null, source_ref: null, density: null, portion_label: null, portion_count: null, planned_amount: null, split_from: null,
    parent_id: null, swapped_from: null, note: null, consumed_at: null },
  foods: { brand: null, state: null, density: null, source: 'custom', source_id: null, source_ref: null, barcode: null, ingredients: null,
    nutrients: {}, portions: [], default_amount: null, max_amount: null, tags: [], allergens: [], is_favorite: false, at_home: false },
  meals: { yield_amount: null, yield_unit: null, default_meal: null, is_favorite: false },
  meal_items: { position: 0, food_id: null, brand: null, state: null, density: null, portion_label: null, tags: [], allergens: [] },
  targets: { nutrients: {}, fluid_ml: null, fluid_mode: 'all_drinks' },
  profiles: PROFILE_DEFAULTS,
};

function load(): Tables {
  if (db) return db;
  let saved: Tables | null = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { saved = null; }
  db = saved ?? { profiles: [], targets: [], foods: [], meals: [], meal_items: [], diary_entries: [] };
  if (!saved) {
    db.profiles.push({ user_id: DEMO_USER.id, ...PROFILE_DEFAULTS, created_at: now(), updated_at: now() });
    seedDemo(db, DEMO_USER.id);
    save();
  }
  return db;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage unavailable: keeps working in memory */ }
}
function table(name: string): Row[] {
  if (name === 'catalog_foods') return catalog as unknown as Row[];
  const t = load();
  t[name] ??= [];
  return t[name];
}
export function newRow(name: string, r: Row): Row {
  const base: Row = { ...(DEFAULTS[name] ?? {}) };
  if (name !== 'profiles') base.id = uuid();
  return { ...base, user_id: DEMO_USER.id, created_at: now(), updated_at: now(), ...r };
}

type Filter = (r: Row) => boolean;
type Result = { data: unknown; error: { message: string } | null };

class Query implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private lim: number | null = null;
  private from_: number | null = null;
  private to_: number | null = null;
  private one: 'single' | 'maybe' | null = null;
  private returning = false;
  private cols = '*';
  private payload: Row | Row[] | null = null;
  private conflict: string[] = [];
  constructor(private name: string) {}

  select(cols = '*') { if (this.op !== 'select') this.returning = true; this.cols = cols; return this; }
  insert(p: Row | Row[]) { this.op = 'insert'; this.payload = p; return this; }
  update(p: Row) { this.op = 'update'; this.payload = p; return this; }
  upsert(p: Row, o?: { onConflict?: string }) { this.op = 'upsert'; this.payload = p; this.conflict = (o?.onConflict ?? 'id').split(','); return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => r[c] !== v); return this; }
  gte(c: string, v: string) { this.filters.push((r) => String(r[c]) >= v); return this; }
  lte(c: string, v: string) { this.filters.push((r) => String(r[c]) <= v); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.lim = n; return this; }
  range(a: number, b: number) { this.from_ = a; this.to_ = b; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }

  private project(rows: Row[]): Row[] {
    if (this.cols === '*' || !this.cols) return rows.map((r) => structuredClone(r));
    const keys = this.cols.split(',').map((s) => s.trim());
    return rows.map((r) => Object.fromEntries(keys.map((k) => [k, structuredClone(r[k])])));
  }

  private run(): Result {
    if (this.name === 'catalog_foods' && this.op !== 'select') return { data: null, error: { message: 'Catalog is read-only' } };
    const t = table(this.name);
    const match = (r: Row) => this.filters.every((f) => f(r));
    let rows: Row[] = [];
    if (this.op === 'select') {
      rows = t.filter(match);
      for (const o of [...this.orders].reverse()) {
        rows = [...rows].sort((a, b) => {
          const x = a[o.col] as string | number, y = b[o.col] as string | number;
          return (x < y ? -1 : x > y ? 1 : 0) * (o.asc ? 1 : -1);
        });
      }
      if (this.from_ !== null) rows = rows.slice(this.from_, (this.to_ ?? rows.length) + 1);
      if (this.lim !== null) rows = rows.slice(0, this.lim);
    } else if (this.op === 'insert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload!];
      rows = list.map((r) => newRow(this.name, r));
      t.push(...rows);
    } else if (this.op === 'upsert') {
      const r = this.payload as Row;
      const existing = t.find((x) => this.conflict.every((k) => k === 'user_id' || x[k] === r[k]));
      if (existing) { Object.assign(existing, r, { updated_at: now() }); rows = [existing]; }
      else { const n = newRow(this.name, r); t.push(n); rows = [n]; }
    } else if (this.op === 'update') {
      rows = t.filter(match);
      for (const r of rows) Object.assign(r, this.payload, { updated_at: now() });
    } else if (this.op === 'delete') {
      rows = t.filter(match);
      const ids = new Set(rows);
      const keep = t.filter((r) => !ids.has(r));
      t.length = 0;
      t.push(...keep);
      if (this.name === 'meals') cascade('meal_items', 'meal_id', rows);
      if (this.name === 'diary_entries') cascade('diary_entries', 'parent_id', rows);
    }
    if (this.op !== 'select') save();
    if (this.op !== 'select' && !this.returning) return { data: null, error: null };
    const out = this.project(rows);
    if (this.one === 'single') return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { message: 'Row not found' } };
    if (this.one === 'maybe') return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.run()).then(ok, bad);
  }
}

function cascade(name: string, col: string, removed: Row[]) {
  const ids = new Set(removed.map((r) => r.id));
  const t = table(name);
  const keep = t.filter((r) => !ids.has(r[col]));
  t.length = 0;
  t.push(...keep);
}

export function demoClient() {
  return {
    from: (name: string) => new Query(name),
    rpc: async (fn: string) => {
      if (fn !== 'delete_my_data') return { data: null, error: { message: `Unknown function ${fn}` } };
      const t = load();
      for (const k of ['diary_entries', 'meal_items', 'meals', 'foods', 'targets']) t[k] = [];
      Object.assign(t.profiles[0], PROFILE_DEFAULTS);
      save();
      return { data: null, error: null };
    },
    auth: {
      getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { user: DEMO_USER }, error: null }),
      signInWithOtp: async () => ({ data: {}, error: null }),
    },
  };
}

/** Start the demo again with the sample week. */
export function resetDemo() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  db = null;
}
