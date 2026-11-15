// "Fill my gaps": pick a small set of foods (with realistic portions) that covers as much of
// today's nutrient shortfalls as possible for the fewest calories.
//
// Each nutrient below its daily minimum is a gap. A food's value is the share of each gap it
// closes (capped at the gap, so overshooting one nutrient earns nothing extra), summed over gaps
// and weighted by how far behind that nutrient is. Foods are chosen greedily by value per calorie;
// after each pick the gaps shrink, so the next food complements the first. Foods you avoid or are
// allergic to are never used; foods at home and favourites get a small boost.
import { summarize } from './day';
import { factor, lowerLabel, type MetricKey, type NutrientKey } from './nutrients';
import { allowed, pickAmount, type Candidate, type Preferences } from './recommend';
import type { Entry, Portion, Targets } from './types';

export interface Gap {
  key: NutrientKey;
  have: number;
  min: number;
  /** Share of the daily minimum reached so far (0–1). */
  pct: number;
  /** Some foods eaten today have no value for this nutrient, so the real intake may be higher. */
  uncertain: boolean;
}

export interface BasketItem {
  food: Candidate;
  amount: number;
  portion: Portion | null;
  count: number | null;
  kcal: number;
  /** Amount of each gap nutrient this item adds. */
  adds: Partial<Record<NutrientKey, number>>;
}

export interface Basket {
  gaps: Gap[];
  items: BasketItem[];
  kcal: number;
  /** Projected share of each gap's minimum after eating the basket (0–1+). */
  after: Partial<Record<NutrientKey, number>>;
  /** Gaps where foods without data make up much of the day (shown as estimates). */
  unreliable: NutrientKey[];
  /** Calories left before the basket (negative = already over the goal). */
  room: number;
}

const notReady = (c: Candidate) =>
  (c.state === 'raw' && (c.tags ?? []).some((t) => ['meat', 'poultry', 'fish', 'egg'].includes(t))) || c.state === 'dry';
const isExtra = (c: Candidate) => c.kind === 'food' && !!c.tags?.includes('drink_extra');

export function findGaps(entries: Entry[], targets: Targets | null): { gaps: Gap[]; unreliable: NutrientKey[] } {
  const s = summarize(entries, targets);
  const gaps: Gap[] = [];
  const unreliable: NutrientKey[] = [];
  const kcalTotal = s.projected.energy_kcal.value || 1;
  for (const [k, spec] of Object.entries(targets?.nutrients ?? {})) {
    if (k === 'fluid_ml' || !spec?.min) continue;
    const key = k as NutrientKey;
    const t = s.projected[key];
    if (!t) continue;
    if (t.value >= spec.min * 0.98) continue;
    // If items without data make up a big part of the day, the gap may not be real.
    const unknownIds = new Set(t.unknown.map((u) => u.id));
    const unknownKcal = entries.filter((e) => unknownIds.has(e.id)).reduce((a, e) => a + (e.nutrients.energy_kcal ?? 0) * factor(e.amount, e.basis), 0);
    const uncertain = unknownKcal / kcalTotal > 0.3;
    if (uncertain) unreliable.push(key);
    gaps.push({ key, have: t.value, min: spec.min, pct: t.value / spec.min, uncertain });
  }
  gaps.sort((a, b) => a.pct - b.pct);
  return { gaps, unreliable };
}

export function fillGaps(opts: {
  entries: Entry[];
  targets: Targets | null;
  candidates: Candidate[];
  prefs: Preferences;
  maxItems?: number;
}): Basket {
  const { entries, targets, prefs } = opts;
  const maxItems = opts.maxItems ?? 3;
  const { gaps, unreliable } = findGaps(entries, targets);
  const s = summarize(entries, targets);
  const room = (targets?.calories ?? 0) - s.projected.energy_kcal.value;
  const empty: Basket = { gaps, items: [], kcal: 0, after: {}, unreliable, room };
  if (!gaps.length) return empty;

  // Limits we must not push past (sodium, sugar, saturated fat, caffeine, alcohol…).
  const limits = Object.entries(targets?.nutrients ?? {})
    .filter(([k, v]) => v?.max && k !== 'fluid_ml')
    .map(([k, v]) => ({ key: k as NutrientKey, max: v!.max!, have: s.projected[k as MetricKey]?.value ?? 0 }));

  const remaining = new Map<NutrientKey, number>(gaps.map((g) => [g.key, g.min - g.have]));
  const weight = new Map<NutrientKey, number>(gaps.map((g) => [g.key, 1 + (1 - g.pct)])); // further behind → more weight
  const pool = opts.candidates.filter((c) =>
    allowed(c, prefs) && !notReady(c) && !isExtra(c) && (c.nutrients.energy_kcal ?? 0) > 0 &&
    gaps.some((g) => (c.nutrients[g.key] ?? 0) > 0));

  // Budget: what is left of the calorie goal, but never less than a small snack's worth,
  // so the basket can still show the cheapest way to close gaps when the goal is used up.
  let budget = Math.max(room, 150);
  const items: BasketItem[] = [];
  const used = new Set<string>();
  const usedGroups = new Set<string>();
  const groupOf = (c: Candidate) => ['vegetable', 'fruit', 'legume', 'nuts_seeds', 'fish', 'meat', 'poultry', 'egg', 'dairy', 'grain'].find((t) => c.tags?.includes(t)) ?? c.kind;

  for (let round = 0; round < maxItems && budget > 20; round++) {
    let best: { item: BasketItem; score: number; value: number } | null = null;
    for (const c of pool) {
      const id = c.ref.type + ':' + c.ref.id;
      if (used.has(id)) continue;
      const def = c.default_amount ?? 100;
      for (const mult of [0.5, 1, 1.5]) {
        const a = pickAmount(c, def * mult, budget);
        if (!a) continue;
        const kcal = (c.nutrients.energy_kcal ?? 0) * factor(a.amount, c.basis);
        if (kcal <= 0) continue;
        let value = 0;
        const adds: BasketItem['adds'] = {};
        for (const g of gaps) {
          const per = c.nutrients[g.key];
          if (!per) continue;
          const add = per * factor(a.amount, c.basis);
          adds[g.key] = add;
          const rem = remaining.get(g.key) ?? 0;
          if (rem > 0) value += (Math.min(add, rem) / g.min) * weight.get(g.key)! * (g.uncertain ? 0.7 : 1);
        }
        if (value <= 0.05) continue;
        // Limits (sugar, sodium, saturated fat, caffeine…): a trace never rules a food out, but a
        // food that adds a real amount to a limit you would pass is skipped.
        let limitPenalty = 1;
        let blocked = false;
        for (const l of limits) {
          const add = (c.nutrients[l.key] ?? 0) * factor(a.amount, c.basis);
          if (l.have + add <= l.max || add <= 0) continue;
          if (add > l.max * 0.05) { blocked = true; break; }
          limitPenalty *= 0.85;
        }
        if (blocked) continue;
        let score = (value / (kcal + 40)) * limitPenalty;
        if (c.atHome) score *= 1.2;
        if (c.favorite) score *= 1.1;
        // A varied plate: the second food from the same group counts for less.
        if (usedGroups.has(groupOf(c))) score *= 0.55;
        if (!best || score > best.score) best = { item: { food: c, amount: a.amount, portion: a.portion, count: a.count, kcal, adds }, score, value };
      }
    }
    // Stop when the next food would add little (less than 15% of one day's need, in total).
    if (!best || best.value < 0.15) break;
    items.push(best.item);
    used.add(best.item.food.ref.type + ':' + best.item.food.ref.id);
    usedGroups.add(groupOf(best.item.food));
    budget -= best.item.kcal;
    for (const [k, v] of Object.entries(best.item.adds) as [NutrientKey, number][]) {
      remaining.set(k, (remaining.get(k) ?? 0) - v);
    }
  }

  const after: Basket['after'] = {};
  for (const g of gaps) {
    const added = items.reduce((a, it) => a + (it.adds[g.key] ?? 0), 0);
    after[g.key] = (g.have + added) / g.min;
  }
  return { gaps, items, kcal: items.reduce((a, it) => a + it.kcal, 0), after, unreliable, room };
}

/** "Vitamin D, iron and calcium" */
export function listNutrients(keys: NutrientKey[]): string {
  const names = keys.map(lowerLabel);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

