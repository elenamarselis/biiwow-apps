'use client';
// Client data access. Every call runs as the signed-in user; Postgres RLS
// guarantees only that user's rows are visible or writable.
import { supabase } from './supabase/client';
import { entryFromFood, type EntryPatch, type NewEntry } from './entries';
import type { Action, Candidate } from './recommend';
import { recipeAsFood } from './recipes';
import type { CatalogFood, Entry, FoodLike, Meal, MealItem, Profile, SavedMeal, Status, Targets, UserFood } from './types';

function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
function normEntry(r: Record<string, unknown> | null): Entry {
  if (!r) throw new Error('No row returned');
  return {
    ...(r as unknown as Entry),
    amount: Number(r.amount),
    density: num(r.density),
    planned_amount: num(r.planned_amount),
    portion_count: num(r.portion_count),
  };
}
function normFood(r: Record<string, unknown> | null): UserFood {
  if (!r) throw new Error('No row returned');
  return {
    ...(r as unknown as UserFood),
    density: num(r.density),
    default_amount: num(r.default_amount),
    max_amount: num(r.max_amount),
  };
}

// ------------------------------------------------------------ profile & targets

export async function loadProfile(): Promise<Profile | null> {
  const sb = supabase();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const p = check(await sb.from('profiles').select('*').eq('user_id', u.user.id).maybeSingle());
  if (p) return p as Profile;
  // created by trigger normally; create if missing (e.g. users made before the migration)
  return check(await sb.from('profiles').insert({ user_id: u.user.id }).select('*').single()) as Profile;
}

export async function saveProfile(patch: Partial<Profile>) {
  const sb = supabase();
  const { data: u } = await sb.auth.getUser();
  check(await sb.from('profiles').update(patch).eq('user_id', u.user!.id));
}

export async function loadTargets(): Promise<Targets[]> {
  const rows = check(await supabase().from('targets').select('*').order('effective_date'));
  return (rows ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as Targets),
    calories: Number(r.calories),
    fluid_ml: num(r.fluid_ml),
  }));
}

/** Saves targets effective from a date; a change on the same date replaces that row. */
export async function saveTargets(t: Omit<Targets, 'id'>) {
  check(await supabase().from('targets').upsert(
    { effective_date: t.effective_date, calories: t.calories, nutrients: t.nutrients, fluid_ml: t.fluid_ml, fluid_mode: t.fluid_mode },
    { onConflict: 'user_id,effective_date' },
  ));
}

// ------------------------------------------------------------ diary

export async function loadEntries(from: string, to: string): Promise<Entry[]> {
  const rows = check(await supabase().from('diary_entries').select('*')
    .gte('entry_date', from).lte('entry_date', to)
    .order('entry_date').order('position').order('created_at'));
  return (rows ?? []).map(normEntry);
}

export async function insertEntries(list: NewEntry[]): Promise<Entry[]> {
  if (!list.length) return [];
  const rows = check(await supabase().from('diary_entries').insert(list.map(({ ...e }) => e)).select('*'));
  return (rows ?? []).map(normEntry);
}

export async function updateEntry(id: string, patch: EntryPatch): Promise<Entry> {
  return normEntry(check(await supabase().from('diary_entries').update(patch).eq('id', id).select('*').single()));
}

export async function deleteEntry(id: string) {
  check(await supabase().from('diary_entries').delete().eq('id', id));
}

/** Logs planned drink extras together with their drink. */
export async function setStatusWithExtras(e: Entry, all: Entry[], patch: EntryPatch) {
  await updateEntry(e.id, patch);
  const extras = all.filter((x) => x.parent_id === e.id && x.status === e.status);
  for (const x of extras) {
    await updateEntry(x.id, { status: patch.status, consumed_at: patch.consumed_at ?? null, planned_amount: x.planned_amount ?? x.amount });
  }
}

export async function copyMeal(fromDate: string, meal: Meal, toDate: string, status: Status = 'planned') {
  const src = (await loadEntries(fromDate, fromDate)).filter((e) => e.meal === meal && e.status !== 'skipped');
  const idMap = new Map<string, string>();
  const parents = src.filter((e) => !e.parent_id);
  const children = src.filter((e) => e.parent_id);
  const strip = (e: Entry): NewEntry => {
    const { id, created_at, ...rest } = e;
    void id; void created_at;
    return {
      ...rest, entry_date: toDate, status, planned_amount: status === 'planned' ? e.amount : null,
      split_from: null, parent_id: null, swapped_from: null, note: null,
      consumed_at: status === 'consumed' ? new Date().toISOString() : null,
    };
  };
  const inserted = await insertEntries(parents.map(strip));
  parents.forEach((p, i) => idMap.set(p.id, inserted[i].id));
  await insertEntries(children.filter((c) => idMap.has(c.parent_id!)).map((c) => ({ ...strip(c), parent_id: idMap.get(c.parent_id!)! })));
  return src.length;
}

// ------------------------------------------------------------ foods

export async function loadCatalog(): Promise<CatalogFood[]> {
  const rows = check(await supabase().from('catalog_foods').select('*').order('name'));
  return (rows ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as CatalogFood),
    source: 'catalog',
    density: num(r.density),
    default_amount: num(r.default_amount),
    max_amount: num(r.max_amount),
  }));
}

export async function loadUserFoods(): Promise<UserFood[]> {
  const rows = check(await supabase().from('foods').select('*').order('name'));
  return (rows ?? []).map(normFood);
}

/** Recently logged foods, newest first, one per name/brand/basis. Built from diary snapshots. */
export async function loadRecent(limit = 30): Promise<(FoodLike & { lastAmount: number; foodId: string | null; catalogId: string | null })[]> {
  const rows = check(await supabase().from('diary_entries')
    .select('name,brand,kind,state,basis,density,nutrients,tags,allergens,amount,food_id,catalog_id,source,source_ref,portion_label,portion_count,parent_id')
    .order('created_at', { ascending: false }).limit(300));
  const seen = new Set<string>();
  const out: (FoodLike & { lastAmount: number; foodId: string | null; catalogId: string | null })[] = [];
  for (const r of (rows ?? []) as Record<string, unknown>[]) {
    const key = `${r.name}|${r.brand ?? ''}|${r.basis}`;
    if (seen.has(key) || r.source === 'recipe') continue;
    seen.add(key);
    out.push({
      name: r.name as string, brand: r.brand as string | null, kind: r.kind as FoodLike['kind'], state: r.state as FoodLike['state'],
      basis: r.basis as FoodLike['basis'], density: num(r.density), nutrients: r.nutrients as FoodLike['nutrients'],
      tags: r.tags as string[], allergens: r.allergens as string[], source: r.source as string, source_ref: r.source_ref as string,
      lastAmount: Number(r.amount), foodId: r.food_id as string | null, catalogId: r.catalog_id as string | null,
      portions: r.portion_label && r.portion_count ? [{ label: r.portion_label as string, amount: Number(r.amount) / Number(r.portion_count) }] : [],
    });
    if (out.length >= limit) break;
  }
  return out;
}

type Savable = FoodLike & { id?: string; catalogId?: string | null };

/** Store (or find) a food in the user's list, e.g. to favourite a catalog item. */
export async function ensureUserFood(f: Savable, patch: Partial<Pick<UserFood, 'is_favorite' | 'at_home'>> = {}): Promise<UserFood> {
  const sb = supabase();
  const source = f.catalogId ? 'catalog' : f.source && ['custom', 'label', 'usda', 'off', 'catalog'].includes(f.source) ? f.source : 'custom';
  const sourceId = f.catalogId ?? f.source_id ?? null;
  if (sourceId) {
    const existing = check(await sb.from('foods').select('*').eq('source', source).eq('source_id', sourceId).maybeSingle());
    if (existing) {
      if (Object.keys(patch).length) return normFood(check(await sb.from('foods').update(patch).eq('id', (existing as UserFood).id).select('*').single()));
      return normFood(existing);
    }
  }
  const row = {
    name: f.name, brand: f.brand ?? null, kind: f.kind, state: f.state ?? null, basis: f.basis, density: f.density ?? null,
    source, source_id: sourceId, source_ref: f.source_ref ?? null, barcode: f.barcode ?? null, ingredients: f.ingredients ?? null,
    nutrients: f.nutrients, portions: f.portions ?? [], default_amount: f.default_amount ?? null, max_amount: f.max_amount ?? null,
    tags: f.tags ?? [], allergens: f.allergens ?? [], ...patch,
  };
  return normFood(check(await sb.from('foods').insert(row).select('*').single()));
}

export async function saveUserFood(id: string | null, f: Omit<FoodLike, 'source'> & { source: 'custom' | 'label' } & Partial<Pick<UserFood, 'is_favorite' | 'at_home'>>) {
  const sb = supabase();
  const row = {
    name: f.name, brand: f.brand ?? null, kind: f.kind, state: f.state ?? null, basis: f.basis, density: f.density ?? null,
    source: f.source, source_ref: f.source === 'label' ? 'Entered from label' : 'Custom entry', barcode: f.barcode ?? null,
    ingredients: f.ingredients ?? null, nutrients: f.nutrients, portions: f.portions ?? [], default_amount: f.default_amount ?? null,
    max_amount: f.max_amount ?? null, tags: f.tags ?? [], allergens: f.allergens ?? [],
    ...(f.is_favorite !== undefined ? { is_favorite: f.is_favorite } : {}),
    ...(f.at_home !== undefined ? { at_home: f.at_home } : {}),
  };
  if (id) return normFood(check(await sb.from('foods').update(row).eq('id', id).select('*').single()));
  return normFood(check(await sb.from('foods').insert(row).select('*').single()));
}

export async function setFoodFlags(id: string, patch: Partial<Pick<UserFood, 'is_favorite' | 'at_home'>>) {
  check(await supabase().from('foods').update(patch).eq('id', id));
}
export async function deleteUserFood(id: string) {
  check(await supabase().from('foods').delete().eq('id', id));
}

// ------------------------------------------------------------ saved meals & recipes

export async function loadMeals(): Promise<SavedMeal[]> {
  const sb = supabase();
  const meals = check(await sb.from('meals').select('*').order('name')) as Record<string, unknown>[];
  const items = check(await sb.from('meal_items').select('*').order('position')) as Record<string, unknown>[];
  return (meals ?? []).map((m) => ({
    ...(m as unknown as SavedMeal),
    yield_amount: num(m.yield_amount),
    items: (items ?? []).filter((i) => i.meal_id === m.id).map((i) => ({
      ...(i as unknown as MealItem), amount: Number(i.amount), density: num(i.density),
    })),
  }));
}

export async function saveMeal(m: Omit<SavedMeal, 'id'> & { id?: string }) {
  const sb = supabase();
  const row = { name: m.name, kind: m.kind, yield_amount: m.yield_amount, yield_unit: m.yield_unit, default_meal: m.default_meal, is_favorite: m.is_favorite };
  const saved = m.id
    ? check(await sb.from('meals').update(row).eq('id', m.id).select('*').single())
    : check(await sb.from('meals').insert(row).select('*').single());
  const id = (saved as { id: string }).id;
  if (m.id) check(await sb.from('meal_items').delete().eq('meal_id', id));
  if (m.items.length) {
    check(await sb.from('meal_items').insert(m.items.map((it, i) => ({
      meal_id: id, position: i, food_id: it.food_id, name: it.name, brand: it.brand, kind: it.kind, state: it.state,
      basis: it.basis, density: it.density, nutrients: it.nutrients, amount: it.amount, unit: it.basis,
      portion_label: it.portion_label, tags: it.tags ?? [], allergens: it.allergens ?? [],
    }))));
  }
  return id;
}
export async function deleteMeal(id: string) {
  check(await supabase().from('meals').delete().eq('id', id));
}

export function entriesToItems(entries: Entry[]): MealItem[] {
  return entries.map((e, i) => ({
    position: i, food_id: e.food_id, name: e.name, brand: e.brand, kind: e.kind, state: e.state, basis: e.basis,
    density: e.density, nutrients: e.nutrients, amount: e.amount, unit: e.basis, portion_label: e.portion_label,
    tags: e.tags, allergens: e.allergens,
  }));
}

/** Add a saved meal to the diary: a group adds each ingredient; a recipe adds one entry. */
export async function addSavedMeal(m: SavedMeal, opts: { date: string; meal: Meal; status: Status; amount?: number }) {
  if (m.kind === 'group') {
    return insertEntries(m.items.map((it) => ({
      ...entryFromFood({ ...it, source: 'custom', id: it.food_id ?? undefined, portions: [] }, {
        date: opts.date, meal: opts.meal, amount: it.amount, status: opts.status,
      }),
      food_id: it.food_id,
      portion_label: it.portion_label,
      portion_count: it.portion_label ? 1 : null,
      source: 'meal',
      source_ref: `Saved meal: ${m.name}`,
      meal_id: m.id,
    })));
  }
  const food = recipeAsFood(m);
  const amount = opts.amount ?? food.default_amount ?? 1;
  return insertEntries([{ ...entryFromFood(food, { date: opts.date, meal: opts.meal, amount, status: opts.status }), meal_id: m.id }]);
}

// ------------------------------------------------------------ suggestions

/** Apply a suggestion's actions. Only planned entries are changed. */
export async function applyActions(actions: Action[], entries: Entry[]) {
  for (const a of actions) {
    if (a.type === 'add') {
      await insertEntries([entryFromFood(asSavable(a.food), { date: a.date, meal: a.meal, amount: a.amount, status: 'planned', portion: a.portion, portionCount: a.portionCount })]);
    } else {
      const e = entries.find((x) => x.id === a.entryId);
      if (!e || e.status !== 'planned') throw new Error('That item is no longer planned, so the suggestion was not applied.');
      if (a.type === 'resize') {
        await updateEntry(e.id, {
          amount: a.amount,
          portion_count: e.portion_count && e.amount ? Math.round((e.portion_count * a.amount / e.amount) * 100) / 100 : e.portion_count,
          planned_amount: a.amount,
          note: `Resized from ${e.amount} ${e.unit}`,
        });
      } else if (a.type === 'skip') {
        await updateEntry(e.id, { status: 'skipped', note: 'Skipped (suggestion)' });
      } else if (a.type === 'replace') {
        const fresh = entryFromFood(asSavable(a.food), { date: e.entry_date, meal: e.meal, amount: a.amount, status: 'planned', portion: a.portion, portionCount: a.portionCount });
        await updateEntry(e.id, { ...fresh, swapped_from: e.name, parent_id: e.parent_id });
      }
    }
  }
}

function asSavable(c: Candidate): FoodLike & { id?: string; catalogId?: string | null } {
  return { ...c, id: c.ref.type === 'food' ? c.ref.id : undefined, catalogId: c.ref.type === 'catalog' ? c.ref.id : null, source: c.ref.type === 'catalog' ? 'catalog' : c.source };
}
