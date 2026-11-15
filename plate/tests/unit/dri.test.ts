import { describe, expect, it } from 'vitest';
import { ageFrom, band, recommendTargets } from '@/lib/dri';

describe('personal reference targets', () => {
  it('uses the DRI for a 35-year-old woman', () => {
    const r = recommendTargets({ age: 35, sex: 'female', heightCm: 168, weightKg: 70, activity: 'light' }, 1600);
    expect(r.nutrients.iron_mg?.min).toBe(18);
    expect(r.nutrients.vitamin_c_mg?.min).toBe(75);
    expect(r.nutrients.vitamin_d_ug?.min).toBe(15);
    expect(r.nutrients.calcium_mg?.min).toBe(1000);
    expect(r.nutrients.magnesium_mg?.min).toBe(320);
    expect(r.nutrients.fiber_g?.min).toBe(22); // 14 g per 1000 kcal
    expect(r.nutrients.sodium_mg?.max).toBe(2300);
    expect(r.fluidMl).toBe(2200);
    // Mifflin–St Jeor: 10*70 + 6.25*168 - 5*35 - 161 = 1414
    expect(r.energy?.bmr).toBe(1414);
    expect(r.energy?.maintenance).toBe(Math.round(1414 * 1.375));
    // eating below maintenance → protein 1.2 g/kg
    expect(r.nutrients.protein_g?.min).toBe(84);
    expect(r.energy!.kgPerWeek).toBeLessThan(0);
  });

  it('changes with age and sex', () => {
    const m = recommendTargets({ age: 60, sex: 'male', heightCm: 180, weightKg: 80, activity: 'moderate' }, 2600);
    expect(m.nutrients.iron_mg?.min).toBe(8);
    expect(m.nutrients.vitamin_b6_mg?.min).toBe(1.7);
    expect(m.nutrients.calcium_mg?.min).toBe(1000);
    expect(recommendTargets({ age: 75, sex: 'female', heightCm: 160, weightKg: 60, activity: null }, 1700).nutrients.vitamin_d_ug?.min).toBe(20);
  });

  it('uses the higher value when sex is not given, and lists what is missing', () => {
    const r = recommendTargets({ age: 30, sex: null, heightCm: null, weightKg: null, activity: null }, 2000);
    expect(r.nutrients.iron_mg?.min).toBe(18);
    expect(r.nutrients.vitamin_c_mg?.min).toBe(90);
    expect(r.missing).toEqual(['sex', 'weight', 'height']);
    expect(r.energy).toBeNull();
  });

  it('warns when the calorie target is below resting needs', () => {
    const r = recommendTargets({ age: 30, sex: 'male', heightCm: 185, weightKg: 90, activity: 'sedentary' }, 1200);
    expect(r.warnings.join(' ')).toMatch(/below your estimated resting needs/);
  });

  it('helpers', () => {
    expect(band(18)).toBe('14-18');
    expect(band(19)).toBe('19-30');
    expect(band(71)).toBe('71+');
    expect(ageFrom(1990, new Date('2026-06-01'))).toBe(36);
  });
});
