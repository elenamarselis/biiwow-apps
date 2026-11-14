import { describe, expect, it } from 'vitest';
import { summarize, calorieStatus, drinkSummary, targetsFor, contributors } from '@/lib/day';
import { logDifferentAmount, markConsumed } from '@/lib/entries';
import { entry, targets, cat } from './helpers';
import type { Entry } from '@/lib/types';

const apply = (e: Entry, patch: Partial<Entry>): Entry => ({ ...e, ...patch });

describe('consumed / planned / projected', () => {
  it('a planned meal and drink both appear in projected, not consumed', () => {
    const eggs = entry('cat-egg-raw', 100, 'planned', 'breakfast');
    const oj = entry('cat-orange-juice', 250, 'planned', 'drinks');
    const s = summarize([eggs, oj]);
    const kcal = cat('cat-egg-raw').nutrients.energy_kcal! + cat('cat-orange-juice').nutrients.energy_kcal! * 2.5;
    expect(s.consumed.energy_kcal.value).toBe(0);
    expect(s.planned.energy_kcal.value).toBeCloseTo(kcal);
    expect(s.projected.energy_kcal.value).toBeCloseTo(kcal);
    expect(s.projected.fluid_ml.value).toBe(250);
  });

  it('marking a planned item eaten moves it from planned to consumed exactly once', () => {
    const eggs = entry('cat-egg-raw', 100, 'planned');
    const before = summarize([eggs]);
    const after = summarize([apply(eggs, markConsumed(eggs))]);
    expect(after.consumed.energy_kcal.value).toBeCloseTo(before.planned.energy_kcal.value);
    expect(after.planned.energy_kcal.value).toBe(0);
    expect(after.projected.energy_kcal.value).toBeCloseTo(before.projected.energy_kcal.value);
  });

  it('logging a different portion keeps the plan for comparison and never double counts', () => {
    const rice = entry('cat-rice-white-cooked', 300, 'planned');
    const per = cat('cat-rice-white-cooked').nutrients.energy_kcal! / 100;
    // had 200 g, keep the remaining 100 g planned
    const { patch, remainder } = logDifferentAmount(rice, 200, 'keep');
    const logged = apply(rice, patch);
    expect(logged.planned_amount).toBe(300);
    expect(logged.amount).toBe(200);
    expect(remainder?.amount).toBe(100);
    const s = summarize([logged, { ...remainder!, id: 'r', position: 0 }]);
    expect(s.consumed.energy_kcal.value).toBeCloseTo(200 * per);
    expect(s.planned.energy_kcal.value).toBeCloseTo(100 * per);
    expect(s.projected.energy_kcal.value).toBeCloseTo(300 * per);

    // had 200 g, skip the rest
    const skip = logDifferentAmount(rice, 200, 'skip');
    expect(skip.remainder).toBeNull();
    const s2 = summarize([apply(rice, skip.patch)]);
    expect(s2.projected.energy_kcal.value).toBeCloseTo(200 * per);

    // had more than planned
    const more = logDifferentAmount(rice, 400, 'keep');
    expect(more.remainder).toBeNull();
    expect(summarize([apply(rice, more.patch)]).projected.energy_kcal.value).toBeCloseTo(400 * per);
  });

  it('skipped entries count nowhere', () => {
    const s = summarize([entry('cat-banana', 118, 'skipped')]);
    expect(s.projected.energy_kcal.value).toBe(0);
  });

  it('calorie status reports room after plan and the amount over', () => {
    const big = entry('cat-pasta-cooked', 1500, 'planned');
    const s = summarize([big]);
    const st = calorieStatus(s, 1800);
    expect(st.over).toBeCloseTo(s.projected.energy_kcal.value - 1800);
    expect(st.roomAfterPlan).toBeLessThan(0);
  });
});

describe('unknown values', () => {
  it('marks totals incomplete when an item has no value, without treating it as zero', () => {
    const bar: Entry = { ...entry('cat-banana', 100, 'consumed'), id: 'bar', name: 'Packaged bar', nutrients: { energy_kcal: 400, protein_g: 7 } };
    const s = summarize([bar, entry('cat-orange', 140, 'consumed')]);
    expect(s.consumed.vitamin_c_mg.unknown.map((u) => u.name)).toEqual(['Packaged bar']);
    expect(s.consumed.vitamin_c_mg.value).toBeGreaterThan(0);
    expect(s.consumed.protein_g.unknown).toHaveLength(0);
  });
});

describe('drinks', () => {
  it('drink extras count once in daily totals and appear in the drinks summary', () => {
    const coffee = entry('cat-coffee-brewed', 240, 'consumed', 'drinks');
    const milk = entry('cat-milk-whole', 30, 'consumed', 'drinks', undefined, { parent_id: coffee.id });
    const s = summarize([coffee, milk]);
    const d = drinkSummary([coffee, milk]);
    expect(d.energy.value).toBeCloseTo(s.consumed.energy_kcal.value);
    expect(d.volume.value).toBe(270);
    expect(d.caffeine.value).toBeGreaterThan(0);
  });

  it('water-only fluid mode counts plain water only', () => {
    const w = entry('cat-water', 500, 'consumed', 'drinks');
    const c = entry('cat-cola', 330, 'consumed', 'drinks');
    expect(summarize([w, c], { fluid_mode: 'water_only' }).consumed.fluid_ml.value).toBe(500);
    expect(summarize([w, c], { fluid_mode: 'all_drinks' }).consumed.fluid_ml.value).toBe(830);
  });
});

describe('targets with effective dates', () => {
  it('uses the targets in force on each day', () => {
    const all = [targets({ effective_date: '2026-11-01', calories: 2200 }), targets({ effective_date: '2026-11-10', calories: 1900 })];
    expect(targetsFor(all, '2026-10-31')).toBeNull();
    expect(targetsFor(all, '2026-11-05')!.calories).toBe(2200);
    expect(targetsFor(all, '2026-11-10')!.calories).toBe(1900);
    expect(targetsFor(all, '2026-12-01')!.calories).toBe(1900);
  });
});

describe('contributors', () => {
  it('ranks foods by contribution', () => {
    const rows = contributors([entry('cat-chicken-breast-roasted', 150, 'consumed'), entry('cat-apple', 180, 'consumed')], 'protein_g', ['consumed']);
    expect(rows.rows[0].entry.name).toMatch(/Chicken/);
    expect(rows.rows[0].share).toBeGreaterThan(0.8);
  });
});
