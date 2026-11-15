// Foods avoided for reasons other than allergy (stored in profiles.diet as no_* codes).
// Detection uses tags, allergens, nutrient values and the food's name / ingredients, so it
// also works for USDA, Open Food Facts and custom items that have no tags.
import type { FoodLike } from './types';

export const AVOID_CHOICES: { code: string; label: string; hint: string }[] = [
  { code: 'no_dairy', label: "Cow's milk dairy", hint: 'milk, cheese, yogurt, butter, cream' },
  { code: 'no_pork', label: 'Pork', hint: 'pork, bacon, ham, salami, lard' },
  { code: 'no_beef', label: 'Beef', hint: 'beef, steak, veal' },
  { code: 'no_red_meat', label: 'All red meat', hint: 'beef, pork, lamb, game' },
  { code: 'no_alcohol', label: 'Alcohol', hint: 'beer, wine, spirits' },
  { code: 'no_caffeine', label: 'Caffeine', hint: 'coffee, black and green tea, cola' },
];

/** Plant drinks and non-cow milks are not cow's-milk dairy. */
const NOT_COW = /\b(soy|soya|oat|almond|rice|coconut|cashew|hazelnut|pea|hemp|goat|sheep|ewe|buffalo|camel|plant[- ]based|vegan|dairy[- ]free|lactose[- ]free alternative)\b/;
const NOT_DAIRY_WORDS = /\b(peanut|almond|cashew|cocoa|shea|nut|seed|apple|coconut) butter\b|\bcream of tartar\b|\bice cream bean\b/;
const DAIRY_WORDS = /\b(milk|cheese|cheddar|mozzarella|parmesan|feta|brie|ricotta|mascarpone|halloumi|yog(h)?urt|skyr|quark|kefir|butter|buttermilk|cream|whey|casein|ghee|curd|ice cream|half-and-half|latte|cappuccino|lactose)\b/;
const PORK_WORDS = /\b(pork|bacon|ham|prosciutto|pancetta|salami|chorizo|pepperoni|lard|guanciale|speck|mortadella|gammon|pig|porchetta)\b/;
const BEEF_WORDS = /\b(beef|steak|veal|brisket|sirloin|ribeye|bresaola|corned beef|hamburger)\b/;
const RED_MEAT_WORDS = /\b(lamb|mutton|venison|goat meat|game|bison|boar|rabbit|horse)\b/;

function text(f: FoodLike) {
  return `${f.name} ${f.brand ?? ''} ${f.ingredients ?? ''}`.toLowerCase();
}

export function isCowDairy(f: FoodLike): boolean {
  const t = text(f);
  const tags = f.tags ?? [];
  if (tags.includes('plant_milk')) return false;
  const name = `${f.name} ${f.brand ?? ''}`.toLowerCase();
  if (NOT_COW.test(name) && !/\bcow\b/.test(name)) return false;
  if (tags.includes('dairy') || tags.includes('milk') || (f.allergens ?? []).includes('milk')) return true;
  return DAIRY_WORDS.test(t.replace(NOT_DAIRY_WORDS, ''));
}
export const isPork = (f: FoodLike) => (f.tags ?? []).includes('pork') || PORK_WORDS.test(text(f));
export const isBeef = (f: FoodLike) => (f.tags ?? []).includes('beef') || BEEF_WORDS.test(text(f));
export const isRedMeat = (f: FoodLike) => isPork(f) || isBeef(f) || RED_MEAT_WORDS.test(text(f));
export const hasAlcohol = (f: FoodLike) => (f.tags ?? []).includes('alcohol') || (f.nutrients.alcohol_g ?? 0) > 0;
export const hasCaffeine = (f: FoodLike) => (f.tags ?? []).includes('caffeinated') || (f.nutrients.caffeine_mg ?? 0) > 0;

const CHECKS: Record<string, (f: FoodLike) => boolean> = {
  no_dairy: isCowDairy, no_pork: isPork, no_beef: isBeef, no_red_meat: isRedMeat, no_alcohol: hasAlcohol, no_caffeine: hasCaffeine,
};

/**
 * Why a food clashes with the user's choices: avoided food groups, allergies (by allergen
 * code or name) and free-text ingredients to avoid. Empty when it is fine.
 */
export function avoidReasons(f: FoodLike, p: { diet: string[]; allergies: string[]; avoid: string[] }): string[] {
  const out: string[] = [];
  for (const code of p.diet) {
    const check = CHECKS[code];
    if (check?.(f)) out.push(AVOID_CHOICES.find((c) => c.code === code)!.label);
  }
  const allergens = new Set((f.allergens ?? []).map((a) => a.toLowerCase()));
  const t = text(f);
  for (const a of p.allergies) {
    const term = a.toLowerCase().replace(/_/g, ' ');
    if (allergens.has(a.toLowerCase()) || (term.length >= 3 && t.includes(term))) out.push(`Allergy: ${term}`);
  }
  for (const raw of p.avoid) {
    const term = raw.toLowerCase().trim();
    // Free text like "cow-based dairy" or "pork products" means the whole food group.
    const group = groupFromText(term);
    if (group && CHECKS[group](f)) { out.push(AVOID_CHOICES.find((c) => c.code === group)!.label); continue; }
    if (term.length >= 3 && t.includes(term)) out.push(`Avoided: ${term}`);
  }
  return [...new Set(out)];
}

/** Map free-text avoid terms onto the food groups above ("dairy", "cow milk" → no_dairy, …). */
export function groupFromText(term: string): string | null {
  const t = term.toLowerCase();
  if (/\b(dairy|cow'?s?[- ]?(milk|based)|lactose|milk products?)\b/.test(t)) return 'no_dairy';
  if (/\b(pork|pig|bacon|ham)\b/.test(t)) return 'no_pork';
  if (/\bred meat\b/.test(t)) return 'no_red_meat';
  if (/\b(beef|veal)\b/.test(t)) return 'no_beef';
  if (/\b(alcohol|booze)\b/.test(t)) return 'no_alcohol';
  if (/\b(caffeine|coffee)\b/.test(t)) return 'no_caffeine';
  return null;
}
