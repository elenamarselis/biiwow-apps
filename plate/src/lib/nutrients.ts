// Nutrient keys, labels and the arithmetic every screen shares.
// A nutrient that is missing from a food's map is UNKNOWN, never zero.

export const NUTRIENTS = [
  { key: 'energy_kcal', label: 'Calories', unit: 'kcal', group: 'energy' },
  { key: 'protein_g', label: 'Protein', unit: 'g', group: 'macro' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g', group: 'macro' },
  { key: 'fat_g', label: 'Fat', unit: 'g', group: 'macro' },
  { key: 'sat_fat_g', label: 'Saturated fat', unit: 'g', group: 'macro' },
  { key: 'fiber_g', label: 'Fiber', unit: 'g', group: 'macro' },
  { key: 'sugar_g', label: 'Sugar', unit: 'g', group: 'macro' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', group: 'mineral' },
  { key: 'water_g', label: 'Water content', unit: 'g', group: 'drink' },
  { key: 'caffeine_mg', label: 'Caffeine', unit: 'mg', group: 'drink' },
  { key: 'alcohol_g', label: 'Alcohol', unit: 'g', group: 'drink' },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', group: 'mineral' },
  { key: 'iron_mg', label: 'Iron', unit: 'mg', group: 'mineral' },
  { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg', group: 'mineral' },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg', group: 'mineral' },
  { key: 'zinc_mg', label: 'Zinc', unit: 'mg', group: 'mineral' },
  { key: 'vitamin_a_ug', label: 'Vitamin A', unit: 'µg', group: 'vitamin' },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg', group: 'vitamin' },
  { key: 'vitamin_d_ug', label: 'Vitamin D', unit: 'µg', group: 'vitamin' },
  { key: 'vitamin_e_mg', label: 'Vitamin E', unit: 'mg', group: 'vitamin' },
  { key: 'vitamin_k_ug', label: 'Vitamin K', unit: 'µg', group: 'vitamin' },
  { key: 'vitamin_b6_mg', label: 'Vitamin B6', unit: 'mg', group: 'vitamin' },
  { key: 'vitamin_b12_ug', label: 'Vitamin B12', unit: 'µg', group: 'vitamin' },
  { key: 'folate_ug', label: 'Folate', unit: 'µg', group: 'vitamin' },
] as const;

export type NutrientKey = (typeof NUTRIENTS)[number]['key'];
/** Nutrient keys plus the derived fluid volume. */
export type MetricKey = NutrientKey | 'fluid_ml';
export type Nutrients = Partial<Record<NutrientKey, number>>;

export const NUTRIENT_KEYS = NUTRIENTS.map((n) => n.key) as NutrientKey[];
const META = new Map<string, { label: string; unit: string; group: string }>(
  NUTRIENTS.map((n) => [n.key, n]),
);
META.set('fluid_ml', { label: 'Fluids', unit: 'ml', group: 'drink' });

export function label(key: MetricKey): string {
  return META.get(key)?.label ?? key;
}
export function unitOf(key: MetricKey): string {
  return META.get(key)?.unit ?? '';
}
export function isNutrientKey(k: string): k is NutrientKey {
  return (NUTRIENT_KEYS as string[]).includes(k);
}

/** Round for display: 0 decimals for big numbers, 1 for small. */
export function fmt(value: number, key?: MetricKey): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 || key === 'energy_kcal' || key === 'fluid_ml' ? 0 : abs >= 10 ? 0 : 1;
  const n = Number(value.toFixed(digits));
  return n.toLocaleString('en-GB', { maximumFractionDigits: digits });
}
export function fmtWithUnit(value: number, key: MetricKey): string {
  const u = unitOf(key);
  return `${fmt(value, key)}${u === 'kcal' ? ' kcal' : ` ${u}`}`;
}

export type Basis = 'g' | 'ml' | 'serving';

/** Multiplier from the per-basis nutrient map to the chosen amount. */
export function factor(amount: number, basis: Basis): number {
  return basis === 'serving' ? amount : amount / 100;
}

/** Nutrients for an amount; unknown keys stay absent. */
export function scale(n: Nutrients, amount: number, basis: Basis): Nutrients {
  const f = factor(amount, basis);
  const out: Nutrients = {};
  for (const k of NUTRIENT_KEYS) {
    const v = n[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v * f;
  }
  return out;
}

export function addInto(target: Nutrients, add: Nutrients, mult = 1) {
  for (const k of NUTRIENT_KEYS) {
    const v = add[k];
    if (typeof v === 'number') target[k] = (target[k] ?? 0) + v * mult;
  }
}

/** Clean a user- or API-provided map: numeric, finite, non-negative values only. */
export function sanitize(input: Record<string, unknown> | null | undefined): Nutrients {
  const out: Nutrients = {};
  if (!input) return out;
  for (const k of NUTRIENT_KEYS) {
    const raw = input[k];
    if (raw === null || raw === undefined || raw === '') continue;
    const v = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}

/** Nutrients most people choose to watch, in the order the dashboard offers them. */
export const DASHBOARD_CHOICES: MetricKey[] = [
  'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'fluid_ml', 'caffeine_mg', 'alcohol_g',
  'calcium_mg', 'iron_mg', 'magnesium_mg', 'potassium_mg', 'zinc_mg',
  'vitamin_a_ug', 'vitamin_c_mg', 'vitamin_d_ug', 'vitamin_e_mg', 'vitamin_k_ug', 'vitamin_b6_mg', 'vitamin_b12_ug', 'folate_ug',
];

/** Label for use mid-sentence: 'Protein' → 'protein', 'Vitamin C' → 'vitamin C'. */
export function lowerLabel(key: MetricKey): string {
  const l = label(key);
  return l.charAt(0).toLowerCase() + l.slice(1);
}
