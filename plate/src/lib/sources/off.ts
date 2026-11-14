// Open Food Facts → FoodLike. OFF stores *_100g values in grams (energy in kcal),
// so minerals and vitamins are converted to mg / µg here. Missing values stay unknown.
import { sanitize, type NutrientKey } from '../nutrients';
import type { FoodLike, Portion } from '../types';
import { stateFromName } from './usda';

const MAP: [string, NutrientKey, number][] = [
  ['energy-kcal_100g', 'energy_kcal', 1],
  ['proteins_100g', 'protein_g', 1],
  ['carbohydrates_100g', 'carbs_g', 1],
  ['fat_100g', 'fat_g', 1],
  ['saturated-fat_100g', 'sat_fat_g', 1],
  ['fiber_100g', 'fiber_g', 1],
  ['sugars_100g', 'sugar_g', 1],
  ['sodium_100g', 'sodium_mg', 1000],
  ['caffeine_100g', 'caffeine_mg', 1000],
  ['calcium_100g', 'calcium_mg', 1000],
  ['iron_100g', 'iron_mg', 1000],
  ['magnesium_100g', 'magnesium_mg', 1000],
  ['potassium_100g', 'potassium_mg', 1000],
  ['zinc_100g', 'zinc_mg', 1000],
  ['vitamin-a_100g', 'vitamin_a_ug', 1e6],
  ['vitamin-c_100g', 'vitamin_c_mg', 1000],
  ['vitamin-d_100g', 'vitamin_d_ug', 1e6],
  ['vitamin-e_100g', 'vitamin_e_mg', 1000],
  ['vitamin-k_100g', 'vitamin_k_ug', 1e6],
  ['vitamin-b6_100g', 'vitamin_b6_mg', 1000],
  ['vitamin-b12_100g', 'vitamin_b12_ug', 1e6],
  ['folates_100g', 'folate_ug', 1e6],
];

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  product_quantity_unit?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  serving_quantity_unit?: string;
  nutriments?: Record<string, number | string>;
  allergens_tags?: string[];
  ingredients_text?: string;
  ingredients_text_en?: string;
  categories_tags?: string[];
}

const ALLERGENS: Record<string, string> = {
  'en:milk': 'milk', 'en:eggs': 'egg', 'en:fish': 'fish', 'en:crustaceans': 'shellfish', 'en:molluscs': 'shellfish',
  'en:nuts': 'tree_nuts', 'en:peanuts': 'peanuts', 'en:gluten': 'gluten', 'en:soybeans': 'soy', 'en:sesame-seeds': 'sesame',
};

export function mapOffProduct(p: OffProduct): FoodLike | null {
  const n = p.nutriments ?? {};
  const raw: Record<string, number> = {};
  for (const [src, key, mult] of MAP) {
    const v = n[src];
    if (v === undefined || v === '') continue;
    const num = Number(v);
    if (Number.isFinite(num)) raw[key] = num * mult;
  }
  if (raw.energy_kcal === undefined && n['energy_100g'] !== undefined) {
    const kj = Number(n['energy_100g']);
    if (Number.isFinite(kj)) raw.energy_kcal = kj / 4.184;
  }
  if (raw.sodium_mg === undefined && n['salt_100g'] !== undefined) {
    const salt = Number(n['salt_100g']);
    if (Number.isFinite(salt)) raw.sodium_mg = (salt / 2.5) * 1000;
  }
  const name = (p.product_name_en || p.product_name || p.generic_name || '').trim();
  if (!name) return null;

  const cats = (p.categories_tags ?? []).join(' ');
  const qtyUnit = (p.product_quantity_unit || p.quantity?.replace(/[\d.,\s]/g, '') || '').toLowerCase();
  const isDrink = /beverages|drinks|waters|juices|milks|sodas/.test(cats) || /^(ml|cl|l|dl)$/.test(qtyUnit);
  const basis = isDrink && /^(ml|cl|l|dl)$/.test(qtyUnit) ? 'ml' : 'g';
  // Alcohol on OFF is % vol; convert to grams per 100 ml (ethanol 0.789 g/ml).
  if (n['alcohol_100g'] !== undefined) {
    const abv = Number(n['alcohol_100g']);
    if (Number.isFinite(abv)) raw.alcohol_g = abv * 0.789;
  }

  const portions: Portion[] = [];
  const sq = Number(p.serving_quantity);
  if (Number.isFinite(sq) && sq > 0) {
    const sUnit = (p.serving_quantity_unit ?? (basis === 'ml' ? 'ml' : 'g')).toLowerCase();
    if (sUnit === basis) portions.push({ label: p.serving_size ? `1 serving (${p.serving_size})` : '1 serving', amount: sq });
  }

  return {
    name,
    brand: p.brands?.split(',')[0]?.trim() || null,
    kind: isDrink ? 'drink' : 'food',
    state: stateFromName(name),
    basis,
    density: null,
    nutrients: sanitize(raw),
    portions,
    default_amount: portions[0]?.amount ?? 100,
    max_amount: Math.max(portions[0]?.amount ?? 100, 100) * 2.5,
    tags: isDrink ? ['cold_drink'] : [],
    allergens: [...new Set((p.allergens_tags ?? []).map((a) => ALLERGENS[a]).filter(Boolean))],
    ingredients: p.ingredients_text_en || p.ingredients_text || null,
    source: 'off',
    source_id: p.code ?? null,
    source_ref: p.code ? `Open Food Facts ${p.code}` : 'Open Food Facts',
    barcode: p.code ?? null,
  };
}

const FIELDS = 'code,product_name,product_name_en,generic_name,brands,quantity,product_quantity_unit,serving_size,serving_quantity,serving_quantity_unit,nutriments,allergens_tags,ingredients_text,ingredients_text_en,categories_tags';
const UA = 'biiwow-plate/1.0 (personal nutrition diary)';

export async function offByBarcode(code: string, signal?: AbortSignal): Promise<FoodLike | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, {
    signal, headers: { 'user-agent': UA, accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts lookup failed (${res.status})`);
  const json = (await res.json()) as { status?: number; product?: OffProduct };
  if (!json.product || json.status === 0) return null;
  return mapOffProduct({ ...json.product, code: json.product.code ?? code });
}

export async function searchOff(query: string, signal?: AbortSignal): Promise<FoodLike[]> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '15');
  url.searchParams.set('fields', FIELDS);
  const res = await fetch(url, { signal, headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!res.ok) throw new Error(`Open Food Facts search failed (${res.status})`);
  const json = (await res.json()) as { products?: OffProduct[] };
  return (json.products ?? []).map(mapOffProduct).filter((f): f is FoodLike => !!f && f.nutrients.energy_kcal !== undefined);
}
