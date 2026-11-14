import { describe, expect, it } from 'vitest';
import { mapFdcFood, stateFromName, type FdcFood } from '@/lib/sources/usda';
import { mapOffProduct, type OffProduct } from '@/lib/sources/off';
import usda from '@/lib/sources/fixtures/usda-search.json';
import off from '@/lib/sources/fixtures/off-product.json';
import { diaryCsv } from '@/lib/csv';
import { entry } from './helpers';

describe('USDA mapping', () => {
  it('maps nutrients by number, keeps unknowns absent, uses real portions only', () => {
    const egg = mapFdcFood(usda.foods[0] as FdcFood);
    expect(egg.nutrients.energy_kcal).toBe(143);
    expect(egg.nutrients.vitamin_d_ug).toBe(2);
    expect(egg.nutrients.vitamin_c_mg).toBeUndefined();
    expect(egg.portions).toEqual([{ label: '1 large', amount: 50 }]);
    expect(egg.state).toBe('raw');
    expect(egg.source_ref).toBe('USDA FDC 171287 (SR Legacy)');
  });
  it('derives density from a cup measure', () => {
    const milk = mapFdcFood(usda.foods[2] as FdcFood);
    expect(milk.kind).toBe('drink');
    expect(milk.density).toBeCloseTo(244 / 236.6, 2);
  });
  it('distinguishes raw from cooked', () => {
    expect(stateFromName('Chicken, breast, roasted')).toBe('cooked');
    expect(stateFromName('Rice, white, long-grain, dry')).toBe('dry');
    expect(stateFromName('Spinach, raw')).toBe('raw');
  });
});

describe('Open Food Facts mapping', () => {
  it('converts units and leaves missing vitamins unknown', () => {
    const f = mapOffProduct(off.product as OffProduct)!;
    expect(f.nutrients.energy_kcal).toBe(420);
    expect(f.nutrients.sodium_mg).toBeCloseTo(200);
    expect(f.nutrients.vitamin_c_mg).toBeUndefined();
    expect(f.portions).toEqual([{ label: '1 serving (1 bar (40 g))', amount: 40 }]);
    expect(f.allergens).toEqual(['gluten']);
  });
  it('treats liquids as per 100 ml and alcohol % vol as grams', () => {
    const f = mapOffProduct({ code: '1', product_name: 'Lager', quantity: '330 ml', categories_tags: ['en:beverages'], nutriments: { 'energy-kcal_100g': 43, alcohol_100g: 5 } })!;
    expect(f.basis).toBe('ml');
    expect(f.kind).toBe('drink');
    expect(f.nutrients.alcohol_g).toBeCloseTo(3.945);
  });
});

describe('CSV', () => {
  it('exports one row per entry with blank unknowns and escapes formulas', () => {
    const e = { ...entry('cat-banana', 118, 'consumed'), name: '=HYPERLINK("x")', nutrients: { energy_kcal: 89 } };
    const csv = diaryCsv([e]);
    const [head, row] = csv.trim().split('\r\n');
    expect(head.split(',')[0]).toBe('date');
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain('105.02');
  });
});
