import { NUTRIENT_KEYS, scale, type Nutrients } from './nutrients';
import type { FoodLike, MealItem, SavedMeal } from './types';

/** Sum of a recipe's ingredients. A nutrient is unknown if any ingredient lacks it. */
export function sumItems(items: Pick<MealItem, 'nutrients' | 'amount' | 'basis'>[]): Nutrients {
  const out: Nutrients = {};
  for (const k of NUTRIENT_KEYS) {
    let total = 0;
    let known = true;
    for (const it of items) {
      const v = scale(it.nutrients, it.amount, it.basis)[k];
      if (v === undefined) { known = false; break; }
      total += v;
    }
    if (known && items.length) out[k] = total;
  }
  return out;
}

/** A homemade recipe as a loggable food: per 100 g of cooked yield, or per serving. */
export function recipeAsFood(m: SavedMeal): FoodLike {
  const total = sumItems(m.items);
  const yieldAmt = m.yield_amount && m.yield_amount > 0 ? m.yield_amount : 1;
  const perServing = m.yield_unit !== 'g';
  const div = perServing ? yieldAmt : yieldAmt / 100;
  const nutrients: Nutrients = {};
  for (const k of NUTRIENT_KEYS) if (total[k] !== undefined) nutrients[k] = total[k]! / div;
  const allergens = [...new Set(m.items.flatMap((i) => i.allergens ?? []))];
  const tags = [...new Set(m.items.flatMap((i) => i.tags ?? []).filter((t) => ['meat', 'poultry', 'fish', 'egg', 'dairy'].includes(t))), 'meal_main'];
  return {
    name: m.name,
    kind: 'food',
    state: 'prepared',
    basis: perServing ? 'serving' : 'g',
    nutrients,
    portions: [],
    default_amount: perServing ? 1 : Math.min(yieldAmt, 300),
    max_amount: perServing ? Math.max(2, yieldAmt) : yieldAmt,
    tags,
    allergens,
    source: 'recipe',
    source_ref: `Recipe: ${m.items.length} ingredient${m.items.length === 1 ? '' : 's'}, yield ${fmtYield(m)}`,
  };
}

export function fmtYield(m: Pick<SavedMeal, 'yield_amount' | 'yield_unit'>): string {
  if (!m.yield_amount) return 'not set';
  return m.yield_unit === 'g' ? `${m.yield_amount} g cooked` : `${m.yield_amount} serving${m.yield_amount === 1 ? '' : 's'}`;
}
