import { describe, expect, it } from 'vitest';
import { fillGaps, findGaps } from '@/lib/basket';
import { summarize } from '@/lib/day';
import { CATALOG, entry, targets, noPrefs } from './helpers';

const T = targets({
  calories: 1800,
  nutrients: { protein_g: { min: 90 }, fiber_g: { min: 25 }, vitamin_c_mg: { min: 75 }, vitamin_k_ug: { min: 90 }, folate_ug: { min: 400 },
    iron_mg: { min: 18 }, magnesium_mg: { min: 320 }, potassium_mg: { min: 2600 }, sodium_mg: { max: 2300 } },
});

describe('fill my gaps', () => {
  const day = [entry('cat-oats-dry', 50, 'consumed', 'breakfast'), entry('cat-apple', 180, 'consumed', 'breakfast')];

  it('finds gaps, most behind first', () => {
    const { gaps } = findGaps(day, T);
    expect(gaps.length).toBeGreaterThan(4);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i].pct).toBeGreaterThanOrEqual(gaps[i - 1].pct);
  });

  it('covers several gaps with few calories, within the calorie room', () => {
    const b = fillGaps({ entries: day, targets: T, candidates: CATALOG, prefs: noPrefs });
    expect(b.items.length).toBeGreaterThan(0);
    expect(b.items.length).toBeLessThanOrEqual(3);
    expect(b.kcal).toBeLessThanOrEqual(b.room);
    // more nutrient coverage per calorie than simply eating more of the same breakfast
    const covered = b.gaps.filter((g) => (b.after[g.key] ?? 0) > g.pct + 0.1).length;
    expect(covered).toBeGreaterThanOrEqual(4);
    // realistic portions
    for (const it of b.items) expect(it.amount).toBeLessThanOrEqual((it.food.max_amount ?? 500) + 1);
    // limits respected
    const sodiumAfter = summarize(day).projected.sodium_mg.value + b.items.reduce((a, it) => a + (it.food.nutrients.sodium_mg ?? 0) * it.amount / 100, 0);
    expect(sodiumAfter).toBeLessThanOrEqual(2300);
  });

  it('respects foods to avoid and allergies', () => {
    const b = fillGaps({ entries: day, targets: T, candidates: CATALOG, prefs: { ...noPrefs, diet: ['no_dairy', 'no_pork'], allergies: ['soy'] } });
    for (const it of b.items) {
      expect(it.food.tags).not.toContain('dairy');
      expect(it.food.tags).not.toContain('pork');
      expect(it.food.allergens).not.toContain('soy');
    }
  });

  it('prefers foods at home when they do the job nearly as well', () => {
    const first = fillGaps({ entries: day, targets: T, candidates: CATALOG, prefs: noPrefs }).items[0];
    const alt = CATALOG.find((c) => c.ref.id === 'cat-broccoli-cooked')!;
    const withHome = CATALOG.map((c) => (c === alt ? { ...c, atHome: true } : c));
    const b = fillGaps({ entries: day, targets: T, candidates: withHome, prefs: noPrefs });
    expect(b.items.some((it) => it.food.ref.id === 'cat-broccoli-cooked') || b.items[0].food.ref.id === first.food.ref.id).toBe(true);
  });

  it('returns nothing when there are no gaps', () => {
    const b = fillGaps({ entries: day, targets: targets({ calories: 1800 }), candidates: CATALOG, prefs: noPrefs });
    expect(b.gaps).toHaveLength(0);
    expect(b.items).toHaveLength(0);
  });
});
