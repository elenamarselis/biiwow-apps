// Rules-based recommendation engine.
// Input: today's entries (consumed + still planned), the targets in force, the
// foods the user can choose from, preferences, and the previous days.
// Output: up to three suggestions, each with concrete actions on PLANNED items
// only, and before/after projected totals computed from the food data.
import { entryFromFood, roundToStep, round2 } from './entries';
import { summarize, targetFor, totalsOf, entryValue, type Totals, type DaySummary } from './day';
import { factor, fmt, label, lowerLabel, unitOf, type MetricKey, type NutrientKey } from './nutrients';
import type { Entry, FoodLike, Meal, Portion, Targets } from './types';

export interface Candidate extends FoodLike {
  id?: string;
  ref: { type: 'catalog' | 'food'; id: string };
  favorite?: boolean;
  atHome?: boolean;
}

export type Action =
  | { type: 'add'; date: string; meal: Meal; food: Candidate; amount: number; portion?: Portion | null; portionCount?: number | null }
  | { type: 'replace'; entryId: string; food: Candidate; amount: number; portion?: Portion | null; portionCount?: number | null }
  | { type: 'resize'; entryId: string; amount: number }
  | { type: 'skip'; entryId: string };

export interface Impact {
  key: MetricKey;
  before: number;
  after: number;
  min?: number;
  max?: number;
  incomplete: boolean;
}

export type SuggestionKind = 'fill_gap' | 'swap_for_gap' | 'cut_calories' | 'fluids' | 'drink_limit' | 'pattern';

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  subject: MetricKey;
  title: string;
  reason: string;
  actions: Action[];
  /** Projected totals before and after, for the date the actions apply to. */
  impacts: Impact[];
  tradeoffs: string[];
  note?: string;
  appliesTo: string; // date
  score: number;
}

export interface Preferences {
  allergies: string[];
  avoid: string[];
  diet: string[];
  liked: string[];
}

export interface HistoryDay {
  date: string;
  entries: Entry[];
  targets: Targets | null;
}

export interface RecommendInput {
  date: string;
  hour: number;
  entries: Entry[];
  targets: Targets | null;
  candidates: Candidate[];
  prefs: Preferences;
  history?: HistoryDay[];
  /** Metrics the user tracks (dashboard); min targets are always considered. */
  tracked?: MetricKey[];
}

export interface RecommendResult {
  suggestions: Suggestion[];
  /** Plain-language status when there is nothing (or nothing reliable) to suggest. */
  message: string | null;
  notes: string[];
}

// ------------------------------------------------------------------ helpers

const kcalOf = (f: FoodLike, amount: number) => (f.nutrients.energy_kcal ?? NaN) * factor(amount, f.basis);
const nOf = (f: FoodLike, key: NutrientKey, amount: number) => {
  const v = f.nutrients[key];
  return typeof v === 'number' ? v * factor(amount, f.basis) : null;
};
const entryKcal = (e: Entry) => entryValue(e, 'energy_kcal') ?? 0;

const DRINK_ROLE = ['hot_drink', 'cold_drink'];
const FOOD_ROLES = ['snack', 'sweet', 'grain', 'dairy', 'protein', 'fruit', 'vegetable', 'side', 'breakfast', 'meal_main', 'legume', 'nuts_seeds'];

const MEAL_FIT: Record<Meal, string[]> = {
  breakfast: ['breakfast', 'fruit', 'dairy', 'grain', 'egg', 'nuts_seeds'],
  lunch: ['meal_main', 'protein', 'vegetable', 'legume', 'grain', 'side', 'dairy'],
  dinner: ['meal_main', 'protein', 'vegetable', 'legume', 'grain', 'side'],
  snacks: ['snack', 'fruit', 'dairy', 'nuts_seeds', 'sweet', 'vegetable'],
  drinks: [],
};

export function mealFit(f: FoodLike, meal: Meal): number {
  if (meal === 'drinks') return f.kind === 'drink' ? 1 : 0;
  if (f.kind === 'drink') return 0.3;
  const tags = f.tags ?? [];
  const hits = MEAL_FIT[meal].filter((t) => tags.includes(t)).length;
  return hits === 0 ? 0 : Math.min(1, 0.5 + hits * 0.25);
}

export function upcomingMeal(hour: number): Meal {
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snacks';
  if (hour < 21) return 'dinner';
  return 'snacks';
}
const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'snacks', 'dinner'];

function bestMealFor(f: FoodLike, hour: number, future: boolean): Meal {
  if (f.kind === 'drink') return 'drinks';
  const start = future ? 0 : Math.max(0, MEAL_ORDER.indexOf(upcomingMeal(hour)));
  const options = MEAL_ORDER.slice(start);
  if (!future && hour >= 21) options.splice(0, options.length, 'snacks');
  let best = options[0];
  let bestFit = -1;
  for (const m of options) {
    const fit = mealFit(f, m);
    if (fit > bestFit) { best = m; bestFit = fit; }
  }
  return best;
}

/** Raw meat/fish/egg and dry grains are ingredients, not something to add as-is. */
const notReadyToEat = (c: FoodLike) =>
  (c.state === 'raw' && (c.tags ?? []).some((t) => ['meat', 'poultry', 'fish', 'egg'].includes(t))) || c.state === 'dry';

/** Sugar, honey, syrup, cream: things added to drinks, never suggested alone. Milks still count. */
const isExtra = (c: FoodLike) => c.kind === 'food' && !!c.tags?.includes('drink_extra');

/** 'Vitamin C' → 'vitamin C', 'Protein' → 'protein'. */
const lower = lowerLabel;

const lc = (s: string | null | undefined) => (s ?? '').toLowerCase();

/** Respect allergies, avoided ingredients and diet. */
export function allowed(f: FoodLike, p: Preferences): boolean {
  const allergens = new Set((f.allergens ?? []).map(lc));
  for (const a of p.allergies) if (allergens.has(lc(a))) return false;
  const text = `${lc(f.name)} ${lc(f.brand)} ${lc(f.ingredients)}`;
  for (const raw of [...p.avoid, ...p.allergies]) {
    const term = lc(raw).trim().replace(/_/g, ' ');
    if (term.length >= 3 && text.includes(term)) return false;
  }
  const tags = new Set(f.tags ?? []);
  const has = (...t: string[]) => t.some((x) => tags.has(x) || allergens.has(x));
  const diet = p.diet.map(lc);
  if (diet.includes('vegan') && has('meat', 'poultry', 'fish', 'egg', 'dairy', 'milk', 'shellfish')) return false;
  if (diet.includes('vegan') && /honey/.test(text)) return false;
  if (diet.includes('vegetarian') && has('meat', 'poultry', 'fish', 'shellfish')) return false;
  if (diet.includes('pescatarian') && has('meat', 'poultry')) return false;
  if (diet.includes('no_alcohol') && has('alcohol')) return false;
  return true;
}

function preferenceBonus(f: Candidate, p: Preferences): number {
  let b = 0;
  if (f.atHome) b += 20;
  if (f.favorite) b += 12;
  const name = lc(f.name);
  if (p.liked.some((l) => l.trim().length >= 3 && name.includes(lc(l).trim()))) b += 3;
  return b;
}

/** Choose a realistic amount near `desired`, using real portions where they exist. */
export function pickAmount(
  f: FoodLike,
  desired: number,
  maxKcal?: number,
): { amount: number; portion: Portion | null; count: number | null } | null {
  const def = f.default_amount ?? (f.basis === 'serving' ? 1 : 100);
  const maxAmt = f.max_amount ?? def * 2;
  const portion = (f.portions ?? [])
    .filter((p) => p.amount > 0 && p.amount <= maxAmt)
    .sort((a, b) => Math.abs(a.amount - def) - Math.abs(b.amount - def))[0] ?? null;
  const kcalPerUnit = (f.nutrients.energy_kcal ?? 0) * factor(1, f.basis);

  if (portion && f.basis !== 'serving') {
    const maxCount = Math.max(1, Math.floor(maxAmt / portion.amount + 1e-9));
    let count = Math.min(maxCount, Math.max(1, Math.floor(desired / portion.amount + 0.4)));
    if (maxKcal !== undefined && kcalPerUnit > 0) {
      const fit = Math.floor(maxKcal / (kcalPerUnit * portion.amount) + 1e-9);
      count = Math.min(count, fit);
      if (count < 1) return null;
    }
    return { amount: round2(count * portion.amount), portion, count };
  }
  if (f.basis === 'serving') {
    let n = Math.min(Math.max(1, Math.round(desired * 2) / 2), Math.max(1, maxAmt));
    if (maxKcal !== undefined && kcalPerUnit > 0) n = Math.min(n, Math.floor((maxKcal / kcalPerUnit) * 2) / 2);
    return n >= 0.5 ? { amount: n, portion: null, count: null } : null;
  }
  const minAmt = Math.max(10, roundToStep(def * 0.5, 'down'));
  let amount = roundToStep(Math.min(Math.max(desired, minAmt), maxAmt), 'nearest');
  if (amount > maxAmt) amount = roundToStep(maxAmt, 'down');
  if (maxKcal !== undefined && kcalPerUnit > 0 && amount * kcalPerUnit > maxKcal) {
    amount = roundToStep(maxKcal / kcalPerUnit, 'down');
    if (amount * kcalPerUnit > maxKcal) return null;
  }
  if (amount < minAmt) return null;
  return { amount, portion: null, count: null };
}

function amountText(f: FoodLike, a: { amount: number; portion: Portion | null; count: number | null }): string {
  const unit = f.basis === 'serving' ? (a.amount === 1 ? 'serving' : 'servings') : f.basis;
  if (a.portion && a.count) {
    if (a.count === 1) return /\d\s*(g|ml)\b/.test(a.portion.label) ? a.portion.label : `${a.portion.label} (${fmt(a.amount)} ${unit})`;
    return `${a.count} × ${a.portion.label.replace(/^1\s+/, '')} (${fmt(a.amount)} ${unit} total)`;
  }
  return `${fmt(a.amount)} ${unit}`;
}

const v = (t: Totals, k: MetricKey) => t[k].value;
const amountOf = (x: number, k: MetricKey) => `${fmt(x, k)}${unitOf(k) === 'kcal' ? ' kcal' : ' ' + unitOf(k)}`;
const nice = (f: FoodLike) => (f.brand ? `${f.name} (${f.brand})` : f.name);

/** Apply actions to a copy of the day's entries (used for previews and impacts). */
export function simulate(entries: Entry[], actions: Action[]): Entry[] {
  let out = entries.map((e) => ({ ...e }));
  let i = 0;
  for (const a of actions) {
    if (a.type === 'add') {
      const ne = entryFromFood({ ...a.food, catalogId: a.food.ref.type === 'catalog' ? a.food.ref.id : null }, {
        date: a.date, meal: a.meal, amount: a.amount, status: 'planned', portion: a.portion, portionCount: a.portionCount,
      });
      out.push({ ...ne, id: `preview-${i++}`, position: 999 });
    } else if (a.type === 'replace') {
      out = out.map((e) =>
        e.id === a.entryId && e.status === 'planned'
          ? { ...e, ...entryFromFood({ ...a.food, catalogId: a.food.ref.type === 'catalog' ? a.food.ref.id : null }, {
              date: e.entry_date, meal: e.meal, amount: a.amount, status: 'planned', portion: a.portion, portionCount: a.portionCount,
            }), id: e.id, position: e.position, swapped_from: e.name }
          : e,
      );
    } else if (a.type === 'resize') {
      out = out.map((e) => (e.id === a.entryId && e.status === 'planned'
        ? { ...e, amount: a.amount, portion_count: e.portion_count && e.amount ? round2((e.portion_count * a.amount) / e.amount) : e.portion_count }
        : e));
    } else if (a.type === 'skip') {
      out = out.map((e) => (e.id === a.entryId && e.status === 'planned' ? { ...e, status: 'skipped' as const } : e));
    }
  }
  return out;
}

function impactsFor(before: DaySummary, after: DaySummary, targets: Targets | null, keys: MetricKey[]): Impact[] {
  const seen = new Set<MetricKey>();
  const out: Impact[] = [];
  for (const k of keys) {
    if (seen.has(k)) continue;
    seen.add(k);
    const t = targetFor(targets, k);
    out.push({
      key: k,
      before: v(before.projected, k),
      after: v(after.projected, k),
      min: t.min,
      max: t.max,
      incomplete: after.projected[k].unknown.length > 0,
    });
  }
  return out;
}

function minTargets(targets: Targets | null): { key: MetricKey; min: number }[] {
  if (!targets) return [];
  const out: { key: MetricKey; min: number }[] = [];
  for (const [k, spec] of Object.entries(targets.nutrients)) {
    if (k === 'fluid_ml' || k === 'energy_kcal') continue;
    if (spec?.min && spec.min > 0) out.push({ key: k as MetricKey, min: spec.min });
  }
  return out;
}
function maxTargets(targets: Targets | null): { key: MetricKey; max: number }[] {
  if (!targets) return [];
  const out: { key: MetricKey; max: number }[] = [];
  for (const [k, spec] of Object.entries(targets.nutrients)) {
    if (k === 'energy_kcal') continue;
    if (spec?.max && spec.max > 0) out.push({ key: k as MetricKey, max: spec.max });
  }
  return out;
}

/** Losses in other tracked nutrients that a change causes, in plain words. */
function tradeoffsOf(before: DaySummary, after: DaySummary, targets: Targets | null, subject: MetricKey): string[] {
  const out: string[] = [];
  for (const { key, min } of minTargets(targets)) {
    if (key === subject) continue;
    const b = v(before.projected, key);
    const a = v(after.projected, key);
    if (b - a >= min * 0.03) out.push(`${label(key)} −${amountOf(b - a, key)} (projected ${amountOf(a, key)} of ${amountOf(min, key)})`);
  }
  for (const { key, max } of maxTargets(targets)) {
    if (key === subject) continue;
    const b = v(before.projected, key);
    const a = v(after.projected, key);
    if (a > max && a - b >= max * 0.03) out.push(`${label(key)} +${amountOf(a - b, key)} (over the ${amountOf(max, key)} limit)`);
  }
  return out;
}

/** Share of projected calories coming from entries whose value for `key` is unknown. */
function unknownShare(s: DaySummary, entries: Entry[], key: MetricKey): { share: number; count: number } {
  const unknownIds = new Set(s.projected[key].unknown.map((u) => u.id));
  if (unknownIds.size === 0) return { share: 0, count: 0 };
  const total = s.projected.energy_kcal.value || 1;
  const kcal = entries.filter((e) => unknownIds.has(e.id)).reduce((a, e) => a + entryKcal(e), 0);
  return { share: kcal / total, count: unknownIds.size };
}

// ------------------------------------------------------------------ engine

export function recommend(input: RecommendInput): RecommendResult {
  const { entries, targets, prefs, date, hour } = input;
  const notes: string[] = [];
  if (!targets) return { suggestions: [], message: 'Set a calorie target in Settings to get suggestions.', notes };

  const live = entries.filter((e) => e.entry_date === date);
  const before = summarize(live, targets);
  const target = targets.calories;
  const projectedKcal = v(before.projected, 'energy_kcal');
  const room = target - projectedKcal;
  const pool = input.candidates.filter((c) => allowed(c, prefs) && typeof c.nutrients.energy_kcal === 'number' && !notReadyToEat(c));
  const planned = live.filter((e) => e.status === 'planned' && !e.parent_id);
  const out: Suggestion[] = [];
  let seq = 0;
  const make = (s: Omit<Suggestion, 'id' | 'impacts' | 'tradeoffs' | 'appliesTo'> & { extraKeys?: MetricKey[]; on?: string; baseEntries?: Entry[] }) => {
    const on = s.on ?? date;
    const base = s.baseEntries ?? live;
    const b = on === date ? before : summarize(base, targets);
    const after = summarize(simulate(base, s.actions), targets);
    const keys: MetricKey[] = ['energy_kcal', s.subject, ...(s.extraKeys ?? [])];
    const sug: Suggestion = {
      id: `${s.kind}-${seq++}`,
      kind: s.kind,
      subject: s.subject,
      title: s.title,
      reason: s.reason,
      actions: s.actions,
      note: s.note,
      score: s.score,
      appliesTo: on,
      impacts: impactsFor(b, after, targets, keys),
      tradeoffs: tradeoffsOf(b, after, targets, s.subject),
    };
    out.push(sug);
    return sug;
  };

  // ---- gaps in logged + planned intake (min targets)
  const gaps: { key: NutrientKey; min: number; gap: number; pct: number }[] = [];
  for (const { key, min } of minTargets(targets)) {
    if (key === 'fluid_ml') continue;
    const have = v(before.projected, key);
    if (have < min * 0.95) {
      const unk = unknownShare(before, live, key);
      if (unk.share > 0.3) {
        notes.push(
          `Not enough data to judge ${lower(key)}: ${unk.count} item${unk.count === 1 ? '' : 's'} (${Math.round(unk.share * 100)}% of planned calories) ha${unk.count === 1 ? 's' : 've'} no ${lower(key)} value.`,
        );
        continue;
      }
      gaps.push({ key: key as NutrientKey, min, gap: min - have, pct: (min - have) / min });
    }
  }
  gaps.sort((a, b) => b.pct - a.pct);

  // ---- 1. Over the calorie target: practical changes to planned items
  const overshoot = projectedKcal - target;
  if (overshoot > Math.max(25, target * 0.01)) {
    for (const e of planned) {
      const ek = entryKcal(e);
      if (ek <= 0 || e.nutrients.energy_kcal === undefined) continue;
      const eFood = e as unknown as FoodLike;
      // swap
      const roles = e.kind === 'drink' ? DRINK_ROLE.filter((t) => e.tags.includes(t)) : FOOD_ROLES.filter((t) => e.tags.includes(t));
      if (e.kind === 'drink' || roles.length) {
        for (const c of pool) {
          if (c.kind !== e.kind || c.name === e.name) continue;
          if (isExtra(c)) continue;
          if (e.kind === 'drink') {
            if (roles.length && !roles.some((r) => c.tags?.includes(r))) continue;
            if (c.tags?.includes('alcohol') && !e.tags.includes('alcohol')) continue;
          } else if (!roles.some((r) => c.tags?.includes(r))) continue;
          let amt: ReturnType<typeof pickAmount>;
          if (e.kind === 'drink' && c.basis === e.basis) amt = { amount: e.amount, portion: null, count: null };
          else {
            // a food swap should still be a real serving: aim for the calories left after the cut
            const perK = (c.nutrients.energy_kcal ?? 0) * factor(1, c.basis);
            const aim = Math.max(ek - overshoot, ek * 0.5);
            amt = perK > 0 ? pickAmount(c, Math.min(aim / perK, (c.default_amount ?? 100) * 1.5)) : null;
          }
          if (!amt) continue;
          const ck = kcalOf(c, amt.amount);
          if (e.kind === 'food' && ck < ek * 0.35) continue;
          const save = ek - ck;
          if (!(save >= Math.min(overshoot, ek * 0.3)) || save < 20) continue;
          const actions: Action[] = [{ type: 'replace', entryId: e.id, food: c, amount: amt.amount, portion: amt.portion, portionCount: amt.count }];
          const after = summarize(simulate(live, actions), targets);
          const lossPenalty = tradeoffsOf(before, after, targets, 'energy_kcal').length * 6;
          const cover = Math.min(1, save / overshoot);
          make({
            kind: 'cut_calories', subject: 'energy_kcal',
            title: `Swap ${e.name} for ${amountText(c, amt)} ${nice(c)}`,
            reason: `Saves ${fmt(save)} kcal. Your plan is projected ${fmt(overshoot)} kcal over your ${fmt(target)} kcal target.`,
            actions, score: 70 + cover * 25 - lossPenalty + preferenceBonus(c, prefs) + (e.kind === 'drink' ? 4 : 0),
            extraKeys: [...minTargets(targets).map((m) => m.key).slice(0, 2), ...(e.kind === 'drink' ? (['sugar_g'] as MetricKey[]) : [])],
          });
        }
      }
      // resize
      const perUnit = ek / e.amount;
      const minKeep = e.amount * 0.5;
      let newAmt = e.amount - overshoot / perUnit;
      if (e.portion_label && e.portion_count && e.portion_count > 1) {
        const per = e.amount / e.portion_count;
        const cnt = Math.max(1, Math.floor(newAmt / per + 1e-9));
        newAmt = cnt * per;
      } else newAmt = roundToStep(Math.max(newAmt, minKeep), 'down');
      if (newAmt >= minKeep && newAmt < e.amount && newAmt > 0) {
        const save = (e.amount - newAmt) * perUnit;
        if (save >= 20) {
          const actions: Action[] = [{ type: 'resize', entryId: e.id, amount: round2(newAmt) }];
          const after = summarize(simulate(live, actions), targets);
          const lossPenalty = tradeoffsOf(before, after, targets, 'energy_kcal').length * 6;
          make({
            kind: 'cut_calories', subject: 'energy_kcal',
            title: `Have ${fmt(newAmt)} ${e.unit} of ${e.name} instead of ${fmt(e.amount)} ${e.unit}`,
            reason: `A smaller portion saves ${fmt(save)} kcal of the ${fmt(overshoot)} kcal you're projected over.`,
            actions, score: 55 + Math.min(1, save / overshoot) * 25 - lossPenalty,
            extraKeys: minTargets(targets).map((m) => m.key).slice(0, 2),
          });
        }
      }
      // skip (only small, optional items: snacks, drinks, extras)
      if ((e.meal === 'snacks' || e.meal === 'drinks') && ek >= Math.min(overshoot, 60)) {
        const actions: Action[] = [{ type: 'skip', entryId: e.id }];
        const after = summarize(simulate(live, actions), targets);
        const lossPenalty = tradeoffsOf(before, after, targets, 'energy_kcal').length * 6;
        make({
          kind: 'cut_calories', subject: 'energy_kcal',
          title: `Skip the planned ${e.name}`,
          reason: `Saves ${fmt(ek)} kcal; you're projected ${fmt(overshoot)} kcal over target.`,
          actions, score: 45 + Math.min(1, ek / overshoot) * 20 - lossPenalty,
          extraKeys: minTargets(targets).map((m) => m.key).slice(0, 2),
        });
      }
    }
  }

  // ---- 2. Calories left and a nutrient gap: add a specific food
  if (room >= 60) {
    for (const g of gaps.slice(0, 3)) {
      let best: { c: Candidate; amt: NonNullable<ReturnType<typeof pickAmount>>; score: number; got: number; meal: Meal } | null = null;
      for (const c of pool) {
        if (isExtra(c)) continue;
        const per = nOf(c, g.key, 1);
        if (!per || per <= 0) continue;
        // aim to close the gap, but never beyond a normal serving of this food
        const desired = Math.min(g.gap / per, (c.default_amount ?? 100) * 1.5);
        const amt = pickAmount(c, desired, room);
        if (!amt) continue;
        const got = nOf(c, g.key, amt.amount) ?? 0;
        const k = kcalOf(c, amt.amount);
        if (got < g.gap * 0.2 && got < g.min * 0.1) continue;
        const meal = bestMealFor(c, hour, false);
        const fit = c.kind === 'drink' ? 0.6 : mealFit(c, meal);
        const cover = Math.min(1, got / g.gap);
        const density = got / Math.max(k, 1);
        // penalise pushing other limits
        let limitPenalty = 0;
        for (const { key, max } of maxTargets(targets)) {
          if (key === 'fluid_ml') continue;
          const add = nOf(c, key as NutrientKey, amt.amount) ?? 0;
          if (v(before.projected, key) + add > max) limitPenalty += 12;
        }
        const score = 40 + cover * 30 + Math.min(10, density * 40) + fit * 6 + preferenceBonus(c, prefs) - limitPenalty - (k / Math.max(room, 1)) * 6;
        if (!best || score > best.score) best = { c, amt, score, got, meal };
      }
      if (best) {
        const { c, amt, meal } = best;
        make({
          kind: 'fill_gap', subject: g.key,
          title: `Add ${amountText(c, amt)} ${nice(c)} to ${meal}`,
          reason: `Your logged and planned ${lower(g.key)} is ${amountOf(g.gap, g.key)} below your ${amountOf(g.min, g.key)} target. This adds ${amountOf(best.got, g.key)} for ${fmt(kcalOf(c, amt.amount))} kcal, within the ${fmt(room)} kcal you have left.`,
          actions: [{ type: 'add', date, meal, food: c, amount: amt.amount, portion: amt.portion, portionCount: amt.count }],
          score: best.score + g.pct * 20,
          note: c.atHome ? 'You have this at home.' : c.favorite ? 'One of your favourites.' : undefined,
        });
      }
    }
  }

  // ---- 3. Near the calorie target with a gap: swap or resize something not yet eaten
  if (room < 150) {
    for (const g of gaps.slice(0, 2)) {
      let best: { e: Entry; c: Candidate; amt: NonNullable<ReturnType<typeof pickAmount>>; gain: number; score: number } | null = null;
      for (const e of planned) {
        const ek = entryKcal(e);
        if (ek <= 0) continue;
        const eHas = entryValue(e, g.key);
        if (eHas === null) continue;
        const allowance = ek + Math.max(0, room);
        for (const c of pool) {
          if (c.kind !== e.kind || c.name === e.name || isExtra(c)) continue;
          const sharesRole = (c.tags ?? []).some((t) => e.tags.includes(t) && (FOOD_ROLES.includes(t) || DRINK_ROLE.includes(t)));
          if (mealFit(c, e.meal) < 0.5 && !sharesRole) continue;
          const perK = (c.nutrients.energy_kcal ?? 0) * factor(1, c.basis);
          if (perK <= 0) continue;
          const amt = pickAmount(c, ek / perK, allowance);
          if (!amt) continue;
          const gain = (nOf(c, g.key, amt.amount) ?? 0) - eHas;
          if (gain < Math.max(g.gap * 0.2, g.min * 0.05)) continue;
          const score = 50 + Math.min(1, gain / g.gap) * 30 + preferenceBonus(c, prefs) + (sharesRole ? 4 : 0);
          if (!best || score > best.score) best = { e, c, amt, gain, score };
        }
      }
      if (best) {
        const { e, c, amt } = best;
        make({
          kind: 'swap_for_gap', subject: g.key,
          title: `Swap the planned ${e.name} for ${amountText(c, amt)} ${nice(c)}`,
          reason: `You're close to your calorie target and your logged and planned ${lower(g.key)} is ${amountOf(g.gap, g.key)} short. This swap adds ${amountOf(best.gain, g.key)} for about the same calories.`,
          actions: [{ type: 'replace', entryId: e.id, food: c, amount: amt.amount, portion: amt.portion, portionCount: amt.count }],
          score: best.score + g.pct * 20,
        });
      }
    }
  }

  // ---- 4a. Behind on fluids
  const fluidT = targetFor(targets, 'fluid_ml');
  if (fluidT.min) {
    const have = v(before.projected, 'fluid_ml');
    const gap = fluidT.min - have;
    if (gap >= 150) {
      const waters = pool
        .filter((c) => c.kind === 'drink' && c.basis === 'ml' && (c.tags?.includes('plain_water') || (targets.fluid_mode !== 'water_only' && c.tags?.includes('zero_cal_drink') && !c.tags?.includes('caffeinated'))))
        .sort((a, b) => preferenceBonus(b, prefs) + (b.tags?.includes('plain_water') ? 2 : 0) - (preferenceBonus(a, prefs) + (a.tags?.includes('plain_water') ? 2 : 0)));
      const w = waters[0];
      if (w) {
        const glasses = Math.min(3, Math.max(1, Math.round(gap / 250)));
        const amount = glasses * 250;
        make({
          kind: 'fluids', subject: 'fluid_ml',
          title: `Add ${glasses === 1 ? 'a glass' : `${glasses} glasses`} of ${w.name.toLowerCase()} (${amount} ml)`,
          reason: `Your logged and planned fluids are ${fmt(have)} ml of your ${fmt(fluidT.min)} ml target. This adds ${amount} ml with ${fmt(kcalOf(w, amount))} kcal.`,
          actions: [{ type: 'add', date, meal: 'drinks', food: w, amount, portion: null, portionCount: null }],
          score: 35 + Math.min(1, gap / fluidT.min) * 30 + preferenceBonus(w, prefs),
        });
      }
    }
  }

  // ---- 4b. Approaching or over a drink limit (caffeine, alcohol, sugar, …)
  for (const { key, max } of maxTargets(targets)) {
    if (key === 'fluid_ml' || key === 'energy_kcal') continue;
    const have = v(before.projected, key);
    if (have < max * 0.9) continue;
    const drinks = planned.filter((e) => e.kind === 'drink' && (entryValue(e, key) ?? 0) > 0)
      .sort((a, b) => (entryValue(b, key) ?? 0) - (entryValue(a, key) ?? 0));
    const d = drinks[0];
    if (!d) continue;
    const dHas = entryValue(d, key) ?? 0;
    let best: { c: Candidate; score: number } | null = null;
    for (const c of pool) {
      if (c.kind !== 'drink' || c.basis !== d.basis || c.name === d.name || isExtra(c)) continue;
      const temp = DRINK_ROLE.filter((t) => d.tags.includes(t));
      if (temp.length && !temp.some((t) => c.tags?.includes(t))) continue;
      const cHas = nOf(c, key as NutrientKey, d.amount);
      if (cHas === null || cHas >= dHas * 0.5) continue;
      let score = 50 + preferenceBonus(c, prefs) + (dHas - cHas) / Math.max(dHas, 1) * 10;
      if (key === 'caffeine_mg' && c.tags?.includes('decaf')) score += 6;
      if (key === 'alcohol_g' && c.tags?.includes('alcohol_free')) score += 6;
      if (c.tags?.includes('zero_cal_drink')) score += 2;
      if (!best || score > best.score) best = { c, score };
    }
    if (best) {
      const over = have > max;
      make({
        kind: 'drink_limit', subject: key,
        title: `Swap the planned ${d.name} for ${fmt(d.amount)} ${d.unit} ${nice(best.c)}`,
        reason: over
          ? `Your logged and planned ${lower(key)} is ${amountOf(have, key)}, ${amountOf(have - max, key)} over your ${amountOf(max, key)} limit.`
          : `Your logged and planned ${lower(key)} is ${amountOf(have, key)}, close to your ${amountOf(max, key)} limit.`,
        actions: [{ type: 'replace', entryId: d.id, food: best.c, amount: d.amount, portion: null, portionCount: null }],
        score: best.score + (over ? 15 : 0),
        extraKeys: ['fluid_ml', 'sugar_g'],
      });
    }
  }

  // ---- 5. The same nutrient low over several days: plan it into future meals
  if (input.history?.length) {
    const tomorrow = nextDate(date);
    for (const { key, min } of minTargets(targets)) {
      if (key === 'fluid_ml') continue;
      let logged = 0, low = 0, incompleteDays = 0;
      for (const h of input.history) {
        const t = totalsOf(h.entries, ['consumed']);
        if (t.energy_kcal.value <= 0) continue;
        logged++;
        const hMin = targetFor(h.targets, key).min ?? min;
        if (t[key].value < hMin * 0.8) {
          low++;
          if (t[key].unknown.length) incompleteDays++;
        }
      }
      if (logged < 3 || low < Math.max(3, Math.ceil(logged * 0.6))) continue;
      let best: { c: Candidate; score: number; amt: NonNullable<ReturnType<typeof pickAmount>> } | null = null;
      for (const c of pool) {
        if (isExtra(c)) continue;
        const def = c.default_amount ?? 100;
        const amt = pickAmount(c, def);
        if (!amt) continue;
        const got = nOf(c, key as NutrientKey, amt.amount);
        if (!got || got < min * 0.15) continue;
        const k = Math.max(kcalOf(c, amt.amount), 1);
        const score = 20 + Math.min(15, (got / min) * 30) + Math.min(8, (got / k) * 30) + preferenceBonus(c, prefs);
        if (!best || score > best.score) best = { c, score, amt };
      }
      if (!best) continue;
      const tomorrowEntries = (input.history.find((h) => h.date === tomorrow)?.entries ?? []);
      const meal = bestMealFor(best.c, hour, true);
      make({
        kind: 'pattern', subject: key, on: tomorrow, baseEntries: tomorrowEntries,
        title: `Plan ${amountText(best.c, best.amt)} ${nice(best.c)} for ${meal} tomorrow`,
        reason: `Your logged ${lower(key)} was below 80% of your ${amountOf(min, key)} target on ${low} of the last ${logged} logged days. This adds ${amountOf(nOf(best.c, key as NutrientKey, best.amt.amount) ?? 0, key)}.`,
        note: incompleteDays
          ? `${incompleteDays} of those days include foods with no ${lower(key)} data, so the real intake may be higher than logged.`
          : undefined,
        actions: [{ type: 'add', date: tomorrow, meal, food: best.c, amount: best.amt.amount, portion: best.amt.portion, portionCount: best.amt.count }],
        score: best.score,
      });
    }
  }

  // ---- choose up to three, one per subject and per planned entry
  out.sort((a, b) => b.score - a.score);
  const picked: Suggestion[] = [];
  const usedSubjects = new Map<string, number>();
  const usedEntries = new Set<string>();
  for (const s of out) {
    if (picked.length >= 3) break;
    const entryIds = s.actions.flatMap((a) => ('entryId' in a ? [a.entryId] : []));
    if (entryIds.some((id) => usedEntries.has(id))) continue;
    const subjKey = `${s.kind === 'pattern' ? 'p:' : ''}${s.subject}`;
    const n = usedSubjects.get(subjKey) ?? 0;
    // Calorie cuts may offer two different options; other subjects one each.
    if (n >= (s.subject === 'energy_kcal' ? 2 : 1)) continue;
    // Never offer a suggestion that pushes the plan over the calorie target (unless it is a cut).
    const kcal = s.impacts.find((i) => i.key === 'energy_kcal');
    if (s.kind !== 'cut_calories' && s.appliesTo === date && kcal && kcal.after > target + 1 && kcal.after > kcal.before) continue;
    picked.push(s);
    usedSubjects.set(subjKey, n + 1);
    entryIds.forEach((id) => usedEntries.add(id));
  }

  let message: string | null = null;
  if (!picked.length) {
    if (notes.length) message = 'Your logged data is too incomplete to make a reliable suggestion.';
    else if (gaps.length && room < 60 && !planned.length)
      message = `You're at your calorie target with gaps in ${gaps.map((g) => lower(g.key)).join(', ')}, and nothing is still planned that could be swapped.`;
    else if (gaps.length || overshoot > 25)
      message = 'No worthwhile suggestion found from your foods and the catalog that respects your preferences.';
    else message = "You're on track: your logged and planned intake meets your targets. Nothing to change.";
  }
  return { suggestions: picked, message, notes };
}

function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
