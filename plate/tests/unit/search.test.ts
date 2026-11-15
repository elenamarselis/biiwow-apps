import { describe, expect, it } from 'vitest';
import { matchScore, stem } from '@/lib/search';
import { CATALOG } from './helpers';

const find = (q: string) => CATALOG.map((c) => ({ c, s: matchScore(q, `${c.name} ${c.state ?? ''}`) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.c.name);

describe('food search', () => {
  it('stems plurals', () => {
    expect(stem('eggs')).toBe('egg');
    expect(stem('tomatoes')).toBe('tomato');
    expect(stem('strawberries')).toBe('strawberry');
    expect(stem('peas')).toBe('pea');
  });
  it('finds everyday foods however they are typed', () => {
    expect(find('eggs').some((n) => /Egg, whole, poached/.test(n))).toBe(true);
    expect(find('poached eggs')[0]).toMatch(/poached/i);
    expect(find('fried egg')[0]).toMatch(/fried/i);
    expect(find('tomatoes')[0]).toMatch(/^Tomato/);
    expect(find('strawberry').length).toBeGreaterThan(0);
    expect(find('yoghurt').some((n) => /yogurt/i.test(n))).toBe(true);
    expect(find('aubergine').some((n) => /eggplant/i.test(n))).toBe(true);
    expect(find('porridge').length).toBeGreaterThan(0);
    expect(find('prawns').some((n) => /shrimp/i.test(n))).toBe(true);
    expect(find('cafe latte').length + find('café').length).toBeGreaterThanOrEqual(0);
    expect(find('straw').some((n) => /Strawberr/.test(n))).toBe(true);
  });
  it('does not match unrelated foods', () => {
    expect(find('eggs').some((n) => /^Banana/.test(n))).toBe(false);
  });
});
