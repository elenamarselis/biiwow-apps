// Building diary entries from foods, and the pure state changes behind
// "had it", "had a different amount", "keep the rest planned" and "skip".
import type { Entry, FoodLike, Meal, Portion, Status } from './types';

export type NewEntry = Omit<Entry, 'id' | 'created_at' | 'position'> & { position?: number };

export function entryFromFood(
  food: FoodLike & { id?: string; catalogId?: string | null },
  opts: { date: string; meal: Meal; amount: number; status: Status; portion?: Portion | null; portionCount?: number | null; parentId?: string | null },
): NewEntry {
  const portionLabel = opts.portion ? opts.portion.label : null;
  return {
    entry_date: opts.date,
    meal: opts.meal,
    status: opts.status,
    food_id: food.source === 'catalog' ? null : (food.id ?? null),
    catalog_id: food.catalogId ?? (food.source === 'catalog' ? (food.id ?? null) : null),
    name: food.name,
    brand: food.brand ?? null,
    kind: food.kind,
    state: food.state ?? null,
    source: food.source ?? null,
    source_ref: food.source_ref ?? null,
    basis: food.basis,
    density: food.density ?? null,
    nutrients: food.nutrients,
    tags: food.tags ?? [],
    allergens: food.allergens ?? [],
    amount: opts.amount,
    unit: food.basis,
    portion_label: portionLabel,
    portion_count: opts.portion ? (opts.portionCount ?? 1) : null,
    planned_amount: opts.status === 'planned' ? opts.amount : null,
    split_from: null,
    parent_id: opts.parentId ?? null,
    swapped_from: null,
    note: null,
    consumed_at: opts.status === 'consumed' ? new Date().toISOString() : null,
  };
}

export type EntryPatch = Partial<Omit<Entry, 'id'>>;

/** One tap: the planned item happened exactly as planned. */
export function markConsumed(e: Entry, now = new Date()): EntryPatch {
  return { status: 'consumed', planned_amount: e.planned_amount ?? e.amount, consumed_at: now.toISOString() };
}

/**
 * Logged a different amount than planned. The original plan amount is kept in
 * planned_amount for comparison. If less was had and rest === 'keep', the rest
 * becomes a new planned entry (split_from links it); 'skip' drops it.
 */
export function logDifferentAmount(
  e: Entry,
  actual: number,
  rest: 'keep' | 'skip',
  now = new Date(),
): { patch: EntryPatch; remainder: NewEntry | null } {
  if (!(actual > 0)) throw new Error('Amount must be greater than zero');
  const planned = e.planned_amount ?? e.amount;
  const patch: EntryPatch = {
    status: 'consumed',
    amount: actual,
    planned_amount: planned,
    consumed_at: now.toISOString(),
    portion_count: e.portion_count && e.amount ? round2((e.portion_count * actual) / e.amount) : e.portion_count,
  };
  let remainder: NewEntry | null = null;
  const left = round2(e.amount - actual);
  if (rest === 'keep' && left > 0) {
    const { id, created_at, ...base } = e;
    void created_at;
    remainder = {
      ...base,
      status: 'planned',
      amount: left,
      planned_amount: left,
      portion_count: e.portion_count && e.amount ? round2((e.portion_count * left) / e.amount) : e.portion_count,
      split_from: id,
      consumed_at: null,
      note: null,
    };
  }
  if (rest === 'skip' && left > 0) patch.note = joinNote(e.note, `Rest of plan skipped (${fmtAmt(left, e.unit)})`);
  return { patch, remainder };
}

export function markSkipped(): EntryPatch {
  return { status: 'skipped', consumed_at: null };
}
export function markPlannedAgain(e: Entry): EntryPatch {
  return { status: 'planned', amount: e.planned_amount ?? e.amount, consumed_at: null };
}

export function fmtAmt(amount: number, unit: string): string {
  const n = Math.round(amount * 10) / 10;
  if (unit === 'serving') return `${n} serving${n === 1 ? '' : 's'}`;
  return `${n} ${unit}`;
}

export function describeAmount(e: Pick<Entry, 'amount' | 'unit' | 'portion_label' | 'portion_count'>): string {
  const base = fmtAmt(e.amount, e.unit);
  if (e.portion_label && e.portion_count) {
    const c = round2(e.portion_count);
    return `${c === 1 ? '' : c + ' × '}${e.portion_label} · ${base}`;
  }
  return base;
}

function joinNote(a: string | null, b: string) {
  return a ? `${a}. ${b}` : b;
}
export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Sensible rounding step for an amount in g/ml. */
export function stepFor(amount: number): number {
  if (amount >= 200) return 25;
  if (amount >= 50) return 10;
  return 5;
}
export function roundToStep(amount: number, mode: 'nearest' | 'down' | 'up' = 'nearest'): number {
  const s = stepFor(amount);
  const f = mode === 'down' ? Math.floor : mode === 'up' ? Math.ceil : Math.round;
  return Math.max(s, f(amount / s) * s);
}
