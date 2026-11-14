import catalog from '../../data/catalog.json';
import { entryFromFood } from '@/lib/entries';
import type { Candidate } from '@/lib/recommend';
import type { Entry, Meal, Status, Targets } from '@/lib/types';

export const CATALOG: Candidate[] = (catalog as any[]).map((c) => ({
  ...c, source: 'catalog', ref: { type: 'catalog', id: c.id },
}));
export const cat = (id: string) => {
  const c = CATALOG.find((x) => x.id === id);
  if (!c) throw new Error(`no catalog item ${id}`);
  return c;
};

let n = 0;
export function entry(id: string, amount: number, status: Status, meal: Meal = 'lunch', date = '2026-11-14', extra: Partial<Entry> = {}): Entry {
  const c = cat(id);
  return { ...entryFromFood({ ...c, catalogId: c.id }, { date, meal, amount, status }), id: `e${n++}`, position: 0, ...extra };
}

export function targets(t: Partial<Targets> = {}): Targets {
  return { effective_date: '2026-01-01', calories: 2000, nutrients: {}, fluid_ml: null, fluid_mode: 'all_drinks', ...t };
}

export const noPrefs = { allergies: [], avoid: [], diet: [], liked: [] };
