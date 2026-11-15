// Personal daily reference targets from age, sex, height, weight, activity and calorie target.
// Vitamins and minerals: US National Academies Dietary Reference Intakes (RDA, or AI where no
// RDA exists), as tabulated by the NIH Office of Dietary Supplements. Limits: sodium CDRR,
// caffeine (FDA / EFSA for healthy adults), sugar and saturated fat at 10% of energy
// (Dietary Guidelines for Americans). Energy: Mifflin–St Jeor. These are general reference
// values for healthy people, not medical advice; pregnancy and breastfeeding change them.
import type { MetricKey } from './nutrients';
import type { TargetSpec } from './types';

export type Sex = 'female' | 'male';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface Body {
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  activity: Activity | null;
}

export const ACTIVITY: { key: Activity; label: string; factor: number; hint: string }[] = [
  { key: 'sedentary', label: 'Mostly sitting', factor: 1.2, hint: 'desk job, little exercise' },
  { key: 'light', label: 'Lightly active', factor: 1.375, hint: 'walking, exercise 1–3 days a week' },
  { key: 'moderate', label: 'Moderately active', factor: 1.55, hint: 'exercise 3–5 days a week' },
  { key: 'active', label: 'Very active', factor: 1.725, hint: 'hard exercise 6–7 days a week' },
  { key: 'very_active', label: 'Extremely active', factor: 1.9, hint: 'physical job plus training' },
];

type Band = '14-18' | '19-30' | '31-50' | '51-70' | '71+';
export function band(age: number): Band {
  if (age < 19) return '14-18';
  if (age < 31) return '19-30';
  if (age < 51) return '31-50';
  if (age < 71) return '51-70';
  return '71+';
}

type PerSex = { f: number; m: number };
const same = (v: number): PerSex => ({ f: v, m: v });
/** RDA / AI per age band. */
const DRI: Partial<Record<MetricKey, Record<Band, PerSex>>> = {
  vitamin_a_ug: { '14-18': { f: 700, m: 900 }, '19-30': { f: 700, m: 900 }, '31-50': { f: 700, m: 900 }, '51-70': { f: 700, m: 900 }, '71+': { f: 700, m: 900 } },
  vitamin_c_mg: { '14-18': { f: 65, m: 75 }, '19-30': { f: 75, m: 90 }, '31-50': { f: 75, m: 90 }, '51-70': { f: 75, m: 90 }, '71+': { f: 75, m: 90 } },
  vitamin_d_ug: { '14-18': same(15), '19-30': same(15), '31-50': same(15), '51-70': same(15), '71+': same(20) },
  vitamin_e_mg: { '14-18': same(15), '19-30': same(15), '31-50': same(15), '51-70': same(15), '71+': same(15) },
  vitamin_k_ug: { '14-18': same(75), '19-30': { f: 90, m: 120 }, '31-50': { f: 90, m: 120 }, '51-70': { f: 90, m: 120 }, '71+': { f: 90, m: 120 } },
  vitamin_b6_mg: { '14-18': { f: 1.2, m: 1.3 }, '19-30': same(1.3), '31-50': same(1.3), '51-70': { f: 1.5, m: 1.7 }, '71+': { f: 1.5, m: 1.7 } },
  vitamin_b12_ug: { '14-18': same(2.4), '19-30': same(2.4), '31-50': same(2.4), '51-70': same(2.4), '71+': same(2.4) },
  folate_ug: { '14-18': same(400), '19-30': same(400), '31-50': same(400), '51-70': same(400), '71+': same(400) },
  calcium_mg: { '14-18': same(1300), '19-30': same(1000), '31-50': same(1000), '51-70': { f: 1200, m: 1000 }, '71+': same(1200) },
  iron_mg: { '14-18': { f: 15, m: 11 }, '19-30': { f: 18, m: 8 }, '31-50': { f: 18, m: 8 }, '51-70': same(8), '71+': same(8) },
  magnesium_mg: { '14-18': { f: 360, m: 410 }, '19-30': { f: 310, m: 400 }, '31-50': { f: 320, m: 420 }, '51-70': { f: 320, m: 420 }, '71+': { f: 320, m: 420 } },
  potassium_mg: { '14-18': { f: 2300, m: 3000 }, '19-30': { f: 2600, m: 3400 }, '31-50': { f: 2600, m: 3400 }, '51-70': { f: 2600, m: 3400 }, '71+': { f: 2600, m: 3400 } },
  zinc_mg: { '14-18': { f: 9, m: 11 }, '19-30': { f: 8, m: 11 }, '31-50': { f: 8, m: 11 }, '51-70': { f: 8, m: 11 }, '71+': { f: 8, m: 11 } },
};
/** Fluids from drinks: about 80% of the Adequate Intake for total water (2.7 L women, 3.7 L men). */
const DRINKS_ML: PerSex = { f: 2200, m: 3000 };

export interface Recommendation {
  /** min / max per metric, ready to save as targets. */
  nutrients: Partial<Record<MetricKey, TargetSpec>>;
  fluidMl: number;
  energy: { bmr: number; maintenance: number; deltaPerDay: number; kgPerWeek: number } | null;
  /** Plain-language notes and warnings to show next to the numbers. */
  notes: string[];
  warnings: string[];
  /** Why each value is what it is, for display. */
  basis: Partial<Record<MetricKey | 'fluid_ml', string>>;
  missing: string[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function ageFrom(birthYear: number | null | undefined, today = new Date()): number | null {
  if (!birthYear) return null;
  return today.getFullYear() - birthYear;
}

export function recommendTargets(body: Body, calories: number | null): Recommendation {
  const missing: string[] = [];
  if (!body.age) missing.push('age');
  if (!body.sex) missing.push('sex');
  if (!body.weightKg) missing.push('weight');
  if (!body.heightCm) missing.push('height');
  const notes: string[] = [];
  const warnings: string[] = [];
  const basis: Recommendation['basis'] = {};
  const nutrients: Recommendation['nutrients'] = {};

  const age = body.age ?? 30;
  const b = band(age);
  // Without a sex, use the higher of the two values so the minimums are not too low.
  const pick = (v: PerSex) => (body.sex === 'female' ? v.f : body.sex === 'male' ? v.m : Math.max(v.f, v.m));
  const who = `${body.sex ?? 'adult'}${body.age ? `, ${b === '71+' ? '71 and over' : `age ${b.replace('-', '–')}`}` : ''}`;

  if (age < 14) warnings.push('These reference values are for ages 14 and over.');

  for (const [k, table] of Object.entries(DRI) as [MetricKey, Record<Band, PerSex>][]) {
    nutrients[k] = { min: pick(table[b]) };
    basis[k] = `Dietary Reference Intake for ${who}`;
  }

  // Energy estimate (Mifflin–St Jeor) and what the calorie target implies.
  let energy: Recommendation['energy'] = null;
  if (body.weightKg && body.heightCm && body.age && body.sex) {
    const bmr = 10 * body.weightKg + 6.25 * body.heightCm - 5 * body.age + (body.sex === 'male' ? 5 : -161);
    const factor = ACTIVITY.find((a) => a.key === (body.activity ?? 'sedentary'))!.factor;
    const maintenance = bmr * factor;
    const deltaPerDay = calories ? calories - maintenance : 0;
    energy = { bmr: Math.round(bmr), maintenance: Math.round(maintenance), deltaPerDay: Math.round(deltaPerDay), kgPerWeek: r1((deltaPerDay * 7) / 7700) };
    if (!body.activity) notes.push('Activity not set, so maintenance assumes you mostly sit.');
    if (calories) {
      if (calories < bmr) warnings.push(`Your ${Math.round(calories)} kcal target is below your estimated resting needs (${Math.round(bmr)} kcal). Check it with a doctor or dietitian.`);
      else if (deltaPerDay < -1000) warnings.push('That is a deficit of more than 1,000 kcal a day, faster than the usual 0.5–1 kg a week.');
    }
  }
  const losing = energy ? energy.deltaPerDay < -150 : false;

  // Protein: RDA is 0.8 g/kg; aim higher while eating below maintenance to help keep muscle.
  if (body.weightKg) {
    const perKg = losing ? 1.2 : age >= 65 ? 1.0 : 0.8;
    nutrients.protein_g = { min: Math.round(body.weightKg * perKg) };
    basis.protein_g = losing
      ? `1.2 g per kg body weight while eating below maintenance (RDA is 0.8 g/kg)`
      : age >= 65 ? '1.0 g per kg body weight (often advised from 65; RDA is 0.8 g/kg)' : 'RDA: 0.8 g per kg body weight';
  } else {
    nutrients.protein_g = { min: pick({ f: 46, m: 56 }) };
    basis.protein_g = 'RDA for a reference body weight (add your weight for a personal value)';
  }

  // Fiber: 14 g per 1,000 kcal (Adequate Intake), from the calorie target.
  if (calories) {
    nutrients.fiber_g = { min: Math.round((calories / 1000) * 14) };
    basis.fiber_g = '14 g per 1,000 kcal of your calorie target';
    nutrients.sugar_g = { max: Math.round((calories * 0.1) / 4) };
    basis.sugar_g = 'At most 10% of calories. The app counts all sugars, so this limit is on the strict side.';
    nutrients.sat_fat_g = { max: Math.round((calories * 0.1) / 9) };
    basis.sat_fat_g = 'At most 10% of calories';
  }
  nutrients.sodium_mg = { max: 2300 };
  basis.sodium_mg = 'Chronic disease risk reduction intake: below 2,300 mg';
  if (age >= 18) {
    nutrients.caffeine_mg = { max: 400 };
    basis.caffeine_mg = 'Up to 400 mg a day is considered safe for most healthy adults';
  }
  const fluidMl = pick(DRINKS_ML);
  basis.fluid_ml = `About 80% of the Adequate Intake for total water (${body.sex === 'male' ? '3.7' : body.sex === 'female' ? '2.7' : '2.7–3.7'} L); food provides the rest`;

  notes.push('Reference values for healthy people. Pregnancy, breastfeeding, medical conditions and some medicines change them.');
  return { nutrients, fluidMl, energy, notes, warnings, basis, missing };
}
