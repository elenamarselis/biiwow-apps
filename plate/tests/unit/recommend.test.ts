import { describe, expect, it } from 'vitest';
import { recommend, simulate, allowed, pickAmount } from '@/lib/recommend';
import { summarize } from '@/lib/day';
import { CATALOG, cat, entry, targets, noPrefs } from './helpers';

const DATE = '2026-11-14';

describe('over the calorie target', () => {
  it('offers to replace a planned juice with a lower-calorie drink and shows the saving', () => {
    const entries = [
      entry('cat-pasta-cooked', 500, 'consumed', 'lunch'),
      entry('cat-chicken-breast-roasted', 200, 'consumed', 'lunch'),
      entry('cat-rice-white-cooked', 300, 'planned', 'dinner'),
      entry('cat-salmon-cooked', 150, 'planned', 'dinner'),
      entry('cat-orange-juice', 500, 'planned', 'drinks'),
    ];
    const t = targets({ calories: 1700, nutrients: { protein_g: { min: 90 } } });
    const res = recommend({ date: DATE, hour: 15, entries, targets: t, candidates: CATALOG, prefs: noPrefs });
    const swap = res.suggestions.find((s) => s.kind === 'cut_calories' && s.actions[0].type === 'replace');
    expect(swap, JSON.stringify(res, null, 1)).toBeTruthy();
    const kcal = swap!.impacts.find((i) => i.key === 'energy_kcal')!;
    expect(kcal.after).toBeLessThan(kcal.before);
    // only planned items change; consumed ones stay as recorded
    const after = simulate(entries, swap!.actions);
    for (const e of entries.filter((x) => x.status === 'consumed')) expect(after.find((a) => a.id === e.id)).toEqual(e);
  });

  it('never targets consumed entries', () => {
    const entries = [entry('cat-cola', 2000, 'consumed', 'drinks')];
    const res = recommend({ date: DATE, hour: 15, entries, targets: targets({ calories: 500 }), candidates: CATALOG, prefs: noPrefs });
    expect(res.suggestions.filter((s) => s.kind === 'cut_calories')).toHaveLength(0);
  });
});

describe('calories left with a nutrient gap', () => {
  it('suggests a realistic portion that fits the remaining calories and shows the impact', () => {
    const entries = [
      entry('cat-oats-dry', 50, 'consumed', 'breakfast'),
      entry('cat-pasta-cooked', 250, 'planned', 'dinner'),
    ];
    const t = targets({ calories: 2000, nutrients: { protein_g: { min: 100 } } });
    const res = recommend({ date: DATE, hour: 12, entries, targets: t, candidates: CATALOG, prefs: noPrefs });
    const s = res.suggestions.find((x) => x.kind === 'fill_gap' && x.subject === 'protein_g');
    expect(s, JSON.stringify(res, null, 1)).toBeTruthy();
    const a = s!.actions[0];
    expect(a.type).toBe('add');
    if (a.type !== 'add') return;
    expect(a.amount).toBeLessThanOrEqual(a.food.max_amount ?? 500);
    const p = s!.impacts.find((i) => i.key === 'protein_g')!;
    expect(p.after).toBeGreaterThan(p.before);
    const k = s!.impacts.find((i) => i.key === 'energy_kcal')!;
    expect(k.after).toBeLessThanOrEqual(2000);
    expect(s!.reason).toMatch(/logged and planned protein/);
  });

  it('prefers foods at home and respects allergies', () => {
    const entries = [entry('cat-oats-dry', 50, 'consumed', 'breakfast')];
    const t = targets({ calories: 2000, nutrients: { protein_g: { min: 120 } } });
    const home = CATALOG.map((c) => (c.id === 'cat-tofu-firm' ? { ...c, atHome: true } : c));
    const res = recommend({ date: DATE, hour: 12, entries, targets: t, candidates: home, prefs: noPrefs });
    const a = res.suggestions.find((s) => s.subject === 'protein_g')!.actions[0];
    expect(a.type === 'add' && a.food.ref.id).toBe('cat-tofu-firm');

    const res2 = recommend({ date: DATE, hour: 12, entries, targets: t, candidates: home, prefs: { ...noPrefs, allergies: ['soy'], diet: ['vegetarian'] } });
    for (const s of res2.suggestions) for (const act of s.actions) {
      if (act.type === 'add' || act.type === 'replace') {
        expect(act.food.allergens).not.toContain('soy');
        expect(act.food.tags).not.toContain('meat');
        expect(act.food.tags).not.toContain('fish');
      }
    }
  });
});

describe('near the target with a gap', () => {
  it('swaps a planned item instead of adding calories', () => {
    const entries = [
      entry('cat-pasta-cooked', 600, 'consumed', 'lunch'),
      entry('cat-potato-chips', 50, 'planned', 'snacks'),
    ];
    const kcal = summarize(entries).projected.energy_kcal.value;
    const t = targets({ calories: Math.round(kcal + 40), nutrients: { protein_g: { min: 80 } } });
    const res = recommend({ date: DATE, hour: 15, entries, targets: t, candidates: CATALOG, prefs: noPrefs });
    const s = res.suggestions.find((x) => x.kind === 'swap_for_gap');
    expect(s, JSON.stringify(res, null, 1)).toBeTruthy();
    expect(s!.actions[0].type).toBe('replace');
  });
});

describe('fluids and drink limits', () => {
  it('suggests water when behind on fluids', () => {
    const entries = [entry('cat-coffee-brewed', 240, 'consumed', 'drinks')];
    const t = targets({ calories: 2000, fluid_ml: 2000 });
    const res = recommend({ date: DATE, hour: 11, entries, targets: t, candidates: CATALOG, prefs: noPrefs });
    const s = res.suggestions.find((x) => x.kind === 'fluids')!;
    expect(s).toBeTruthy();
    const f = s.impacts.find((i) => i.key === 'fluid_ml')!;
    expect(f.after - f.before).toBeGreaterThanOrEqual(250);
  });

  it('suggests a decaf swap when approaching a caffeine limit', () => {
    const entries = [
      entry('cat-coffee-brewed', 480, 'consumed', 'drinks'),
      entry('cat-coffee-brewed', 480, 'planned', 'drinks'),
    ];
    const t = targets({ calories: 2000, nutrients: { caffeine_mg: { max: 300 } } });
    const res = recommend({ date: DATE, hour: 11, entries, targets: t, candidates: CATALOG, prefs: noPrefs });
    const s = res.suggestions.find((x) => x.kind === 'drink_limit');
    expect(s, JSON.stringify(res, null, 1)).toBeTruthy();
    const a = s!.actions[0];
    expect(a.type === 'replace' && a.food.tags?.includes('decaf')).toBe(true);
  });
});

describe('patterns over several days', () => {
  it('suggests a food for tomorrow and mentions incomplete days', () => {
    const t = targets({ calories: 2000, nutrients: { fiber_g: { min: 30 } } });
    const history = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'].map((d) => ({
      date: d,
      targets: t,
      entries: [
        entry('cat-chicken-breast-roasted', 200, 'consumed', 'lunch', d),
        { ...entry('cat-bread-white', 60, 'consumed', 'lunch', d), nutrients: { energy_kcal: 266 } },
      ],
    }));
    const res = recommend({ date: DATE, hour: 9, entries: [], targets: t, candidates: CATALOG, prefs: noPrefs, history });
    const s = res.suggestions.find((x) => x.kind === 'pattern');
    expect(s, JSON.stringify(res, null, 1)).toBeTruthy();
    expect(s!.appliesTo).toBe('2026-11-15');
    expect(s!.note).toMatch(/no fiber data/);
  });
});

describe('no worthwhile suggestion', () => {
  it('says so clearly when on track', () => {
    const res = recommend({ date: DATE, hour: 12, entries: [entry('cat-banana', 118, 'consumed')], targets: targets(), candidates: CATALOG, prefs: noPrefs });
    expect(res.suggestions).toHaveLength(0);
    expect(res.message).toMatch(/on track/);
  });
  it('says data is too incomplete when unknown values dominate', () => {
    const e = { ...entry('cat-banana', 118, 'consumed'), nutrients: { energy_kcal: 900 } };
    const t = targets({ nutrients: { vitamin_d_ug: { min: 15 } } });
    const res = recommend({ date: DATE, hour: 12, entries: [e], targets: t, candidates: CATALOG, prefs: noPrefs });
    expect(res.notes.join(' ')).toMatch(/Not enough data to judge vitamin D/);
    expect(res.suggestions.find((s) => s.subject === 'vitamin_d_ug')).toBeUndefined();
  });
});

describe('helpers', () => {
  it('uses real portions where they exist', () => {
    const a = pickAmount(cat('cat-egg-hard-boiled'), 120)!;
    expect(a.portion).toBeTruthy();
    expect(a.amount % a.portion!.amount).toBe(0);
  });
  it('filters diets', () => {
    expect(allowed(cat('cat-chicken-breast-roasted'), { ...noPrefs, diet: ['vegetarian'] })).toBe(false);
    expect(allowed(cat('cat-greek-yogurt-nonfat'), { ...noPrefs, diet: ['vegan'] })).toBe(false);
    expect(allowed(cat('cat-almonds'), { ...noPrefs, avoid: ['almond'] })).toBe(false);
  });
});
