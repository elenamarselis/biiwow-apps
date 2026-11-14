// USDA FoodData Central → FoodLike. Values in FDC are per 100 g.
// Portions come only from FDC household measures (gram weights); none are invented.
import { sanitize, type NutrientKey } from '../nutrients';
import type { FoodLike, FoodState, Portion } from '../types';

/** FDC nutrient numbers. */
const NUMBERS: Record<string, NutrientKey> = {
  '208': 'energy_kcal', '203': 'protein_g', '205': 'carbs_g', '204': 'fat_g', '606': 'sat_fat_g',
  '291': 'fiber_g', '269': 'sugar_g', '307': 'sodium_mg', '255': 'water_g', '262': 'caffeine_mg', '221': 'alcohol_g',
  '301': 'calcium_mg', '303': 'iron_mg', '304': 'magnesium_mg', '306': 'potassium_mg', '309': 'zinc_mg',
  '320': 'vitamin_a_ug', '401': 'vitamin_c_mg', '328': 'vitamin_d_ug', '323': 'vitamin_e_mg', '430': 'vitamin_k_ug',
  '415': 'vitamin_b6_mg', '418': 'vitamin_b12_ug', '435': 'folate_ug',
};
/** Fallbacks used only when the primary number is absent. */
const FALLBACK: Record<string, NutrientKey> = { '958': 'energy_kcal', '957': 'energy_kcal', '2000': 'sugar_g', '417': 'folate_ug' };

interface FdcNutrient {
  nutrientNumber?: string;
  value?: number;
  amount?: number;
  unitName?: string;
  nutrient?: { number?: string; unitName?: string };
}
interface FdcMeasure { disseminationText?: string; gramWeight?: number; modifier?: string; amount?: number; measureUnit?: { name?: string } ; portionDescription?: string }
export interface FdcFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  ingredients?: string;
  foodCategory?: string | { description?: string };
  foodNutrients?: FdcNutrient[];
  foodMeasures?: FdcMeasure[];
  foodPortions?: FdcMeasure[];
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
}

export function stateFromName(name: string): FoodState {
  const n = name.toLowerCase();
  if (/\braw\b|\bfresh\b/.test(n)) return 'raw';
  if (/\b(dry|dried|uncooked|unprepared)\b/.test(n)) return 'dry';
  if (/\b(cooked|boiled|roasted|baked|grilled|broiled|fried|steamed|braised|stewed|poached|scrambled|microwaved)\b/.test(n)) return 'cooked';
  if (/\bprepared\b/.test(n)) return 'prepared';
  return null;
}

const DRINK_CATEGORY = /beverage|juice|milk|alcoholic|coffee|tea|water|drink|smoothie|soda/i;
const ML_PER: Record<string, number> = { cup: 236.6, 'fl oz': 29.57, tbsp: 14.79, tsp: 4.93 };

export function mapFdcFood(f: FdcFood): FoodLike {
  const raw: Record<string, number> = {};
  const fallback: Record<string, number> = {};
  for (const n of f.foodNutrients ?? []) {
    const num = n.nutrientNumber ?? n.nutrient?.number;
    const val = n.value ?? n.amount;
    if (!num || typeof val !== 'number') continue;
    if (NUMBERS[num]) raw[NUMBERS[num]] = val;
    else if (FALLBACK[num]) fallback[FALLBACK[num]] = val;
  }
  for (const [k, val] of Object.entries(fallback)) if (raw[k] === undefined) raw[k] = val;

  const category = typeof f.foodCategory === 'string' ? f.foodCategory : f.foodCategory?.description ?? '';
  const isDrink = (DRINK_CATEGORY.test(category) || /^(milk|beverage|juice|coffee|tea|water|soda|beer|wine)\b/i.test(f.description)) &&
    !/cheese|yogurt|powder|dry|egg|butter|cream cheese/i.test(f.description);

  const portions: Portion[] = [];
  let density: number | null = null;
  for (const m of [...(f.foodMeasures ?? []), ...(f.foodPortions ?? [])]) {
    const text = (m.disseminationText ?? m.portionDescription ?? [m.amount, m.measureUnit?.name, m.modifier].filter(Boolean).join(' ')).trim();
    if (!text || !m.gramWeight || m.gramWeight <= 0 || /quantity not specified/i.test(text)) continue;
    if (portions.some((p) => p.label === text)) continue;
    portions.push({ label: text, amount: Math.round(m.gramWeight * 10) / 10 });
    const unit = Object.keys(ML_PER).find((u) => new RegExp(`^1\\s+${u}\\b`, 'i').test(text));
    if (unit && density === null) density = Math.round((m.gramWeight / ML_PER[unit]) * 1000) / 1000;
  }
  if (f.dataType === 'Branded' && f.servingSize && /^g$/i.test(f.servingSizeUnit ?? '')) {
    portions.unshift({ label: f.householdServingFullText ? `1 serving (${f.householdServingFullText})` : '1 serving', amount: f.servingSize });
  }

  return {
    name: titleCase(f.description),
    brand: f.brandName || f.brandOwner || null,
    kind: isDrink ? 'drink' : 'food',
    state: stateFromName(f.description),
    basis: 'g',
    density,
    nutrients: sanitize(raw),
    portions: portions.slice(0, 6),
    default_amount: portions[0]?.amount ?? 100,
    max_amount: Math.max(300, (portions[0]?.amount ?? 100) * 2),
    tags: isDrink ? ['cold_drink'] : [],
    allergens: [],
    ingredients: f.ingredients ?? null,
    source: 'usda',
    source_id: String(f.fdcId),
    source_ref: `USDA FDC ${f.fdcId}${f.dataType ? ` (${f.dataType})` : ''}`,
    barcode: f.gtinUpc ?? null,
  };
}

function titleCase(s: string) {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s,(])([a-z])/g, (_, a, b) => a + b.toUpperCase());
}

export async function searchUsda(query: string, apiKey: string, signal?: AbortSignal): Promise<FoodLike[]> {
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', '15');
  url.searchParams.set('dataType', 'Foundation,SR Legacy,Survey (FNDDS),Branded');
  const res = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`USDA search failed (${res.status})`);
  const json = (await res.json()) as { foods?: FdcFood[] };
  return (json.foods ?? []).map(mapFdcFood).filter((f) => f.nutrients.energy_kcal !== undefined);
}
