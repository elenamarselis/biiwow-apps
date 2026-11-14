// Day arithmetic: consumed, still planned, projected (= consumed + planned).
// Every entry is in exactly one status, so summing by status never double counts.
import { NUTRIENT_KEYS, factor, type MetricKey, type NutrientKey } from './nutrients';
import type { Entry, Status, Targets } from './types';

export interface MetricTotal {
  value: number;
  /** Entries whose value for this metric is unknown (label shows "incomplete"). */
  unknown: { id: string; name: string }[];
}
export type Totals = Record<MetricKey, MetricTotal>;

/** Volume of a drink entry in ml, or null if it cannot be known. */
export function entryVolumeMl(e: Pick<Entry, 'amount' | 'basis' | 'density' | 'kind'>): number | null {
  if (e.basis === 'ml') return e.amount;
  if (e.basis === 'g' && e.density && e.density > 0) return e.amount / e.density;
  return null;
}

/** Counts towards fluid intake: drinks, and liquid extras (milk) added to a drink. */
export function isFluid(e: Entry, waterOnly = false): boolean {
  if (waterOnly) return e.tags.includes('plain_water');
  return e.kind === 'drink';
}

export function entryValue(e: Entry, key: MetricKey, waterOnly = false): number | null {
  if (key === 'fluid_ml') {
    if (!isFluid(e, waterOnly)) return 0;
    return entryVolumeMl(e);
  }
  const v = e.nutrients?.[key];
  if (typeof v !== 'number') return null;
  return v * factor(e.amount, e.basis);
}

export function emptyTotals(): Totals {
  const t = {} as Totals;
  for (const k of [...NUTRIENT_KEYS, 'fluid_ml'] as MetricKey[]) t[k] = { value: 0, unknown: [] };
  return t;
}

export function totalsOf(entries: Entry[], statuses: Status[], opts: { waterOnly?: boolean } = {}): Totals {
  const t = emptyTotals();
  for (const e of entries) {
    if (!statuses.includes(e.status)) continue;
    for (const k of Object.keys(t) as MetricKey[]) {
      const v = entryValue(e, k, opts.waterOnly);
      if (v === null) t[k].unknown.push({ id: e.id, name: e.name });
      else t[k].value += v;
    }
  }
  return t;
}

export interface DaySummary {
  consumed: Totals;
  planned: Totals;
  projected: Totals;
}

export function summarize(entries: Entry[], targets?: Pick<Targets, 'fluid_mode'> | null): DaySummary {
  const waterOnly = targets?.fluid_mode === 'water_only';
  return {
    consumed: totalsOf(entries, ['consumed'], { waterOnly }),
    planned: totalsOf(entries, ['planned'], { waterOnly }),
    projected: totalsOf(entries, ['consumed', 'planned'], { waterOnly }),
  };
}

export interface CalorieStatus {
  target: number;
  consumed: number;
  planned: number;
  projected: number;
  /** Room left after everything planned; negative when over. */
  roomAfterPlan: number;
  over: number;
  incomplete: boolean;
}

export function calorieStatus(s: DaySummary, target: number): CalorieStatus {
  const projected = s.projected.energy_kcal.value;
  return {
    target,
    consumed: s.consumed.energy_kcal.value,
    planned: s.planned.energy_kcal.value,
    projected,
    roomAfterPlan: target - projected,
    over: Math.max(0, projected - target),
    incomplete: s.projected.energy_kcal.unknown.length > 0,
  };
}

/** Drinks summary: drinks themselves plus extras attached to them. Each entry counted once. */
export function drinkSummary(entries: Entry[], statuses: Status[] = ['consumed', 'planned']) {
  const ids = new Set(entries.filter((e) => e.kind === 'drink').map((e) => e.id));
  const drinkish = entries.filter(
    (e) => statuses.includes(e.status) && (e.kind === 'drink' || (e.parent_id && ids.has(e.parent_id))),
  );
  const t = totalsOf(drinkish, statuses);
  return {
    count: drinkish.filter((e) => e.kind === 'drink' && !e.parent_id).length,
    volume: t.fluid_ml,
    water: t.water_g,
    energy: t.energy_kcal,
    sugar: t.sugar_g,
    caffeine: t.caffeine_mg,
    alcohol: t.alcohol_g,
  };
}

/** Which entries contributed most to a metric. */
export function contributors(entries: Entry[], key: MetricKey, statuses: Status[], waterOnly = false) {
  const rows: { entry: Entry; value: number | null }[] = [];
  for (const e of entries) {
    if (!statuses.includes(e.status)) continue;
    const v = entryValue(e, key, waterOnly);
    if (v === 0 && key === 'fluid_ml') continue;
    rows.push({ entry: e, value: v });
  }
  const total = rows.reduce((a, r) => a + (r.value ?? 0), 0);
  return {
    total,
    rows: rows
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
      .map((r) => ({ ...r, share: r.value && total > 0 ? r.value / total : 0 })),
  };
}

/** Targets in force on a date: latest effective_date on or before it. */
export function targetsFor(all: Targets[], date: string): Targets | null {
  let best: Targets | null = null;
  for (const t of all) {
    if (t.effective_date <= date && (!best || t.effective_date > best.effective_date)) best = t;
  }
  return best;
}

/** min/max for a metric; calories target is a max, fluid target a min. */
export function targetFor(t: Targets | null, key: MetricKey): { min?: number; max?: number } {
  if (!t) return {};
  if (key === 'energy_kcal') return { max: t.calories };
  if (key === 'fluid_ml') {
    const spec = t.nutrients.fluid_ml ?? {};
    return { min: t.fluid_ml ?? spec.min ?? undefined, max: spec.max ?? undefined };
  }
  const spec = t.nutrients[key];
  return { min: spec?.min ?? undefined, max: spec?.max ?? undefined };
}

export const isNutrientMetric = (k: MetricKey): k is NutrientKey => k !== 'fluid_ml';
