// Demo mode: the same sample week as scripts/seed-demo.ts, written straight into the
// in-browser store. Dates are relative to today in the browser's time zone.
import catalog from '../../../data/catalog.json';
import { addDays, localDate } from '../dates';
import { newRow } from './client';

type Row = Record<string, unknown>;
type Cat = (typeof catalog)[number] & { density?: number };
const byId = new Map<string, Cat>((catalog as Cat[]).map((c) => [c.id, c]));

export function seedDemo(db: Record<string, Row[]>, uid: string) {
  const today = localDate();
  const day = (n: number) => addDays(today, n);
  Object.assign(db.profiles[0], {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    dashboard_nutrients: ['protein_g', 'fiber_g', 'fluid_ml', 'sugar_g', 'vitamin_c_mg', 'caffeine_mg'],
    allergies: ['peanuts'], avoid_ingredients: ['coriander'], liked_foods: ['yogurt', 'berries'],
  });
  db.targets.push(
    newRow('targets', { effective_date: day(-30), calories: 2100, nutrients: { protein_g: { min: 90 }, fiber_g: { min: 28 } }, fluid_ml: 2000 }),
    newRow('targets', { effective_date: day(-3), calories: 1900, fluid_ml: 2000,
      nutrients: { protein_g: { min: 100 }, fiber_g: { min: 30 }, vitamin_c_mg: { min: 90 }, sugar_g: { max: 50 }, caffeine_mg: { max: 300 } } }),
  );
  const flags: [string, boolean, boolean][] = [['cat-greek-yogurt-nonfat', true, true], ['cat-blueberries', true, true], ['cat-lentils-cooked', false, true],
    ['cat-coffee-brewed', true, false], ['cat-sparkling-water', true, true], ['cat-egg-hard-boiled', false, true]];
  for (const [id, fav, home] of flags) {
    const c = byId.get(id)!;
    db.foods.push(newRow('foods', { name: c.name, kind: c.kind, state: c.state, basis: c.basis, density: c.density ?? null, source: 'catalog',
      source_id: c.id, source_ref: c.source_ref, nutrients: c.nutrients, portions: c.portions, default_amount: c.default_amount,
      max_amount: c.max_amount, tags: c.tags, allergens: c.allergens, is_favorite: fav, at_home: home }));
  }
  db.foods.push(newRow('foods', { name: 'Oat & honey bar', brand: 'Local bakery', kind: 'food', basis: 'g', source: 'label',
    source_ref: 'Entered from label', nutrients: { energy_kcal: 420, protein_g: 7.5, carbs_g: 62, sugar_g: 24, fat_g: 15, fiber_g: 6.2, sodium_mg: 200 },
    portions: [{ label: '1 bar', amount: 40 }], default_amount: 40, max_amount: 80, tags: ['snack', 'sweet'], allergens: ['gluten'] }));

  const e = (date: string, meal: string, id: string, amount: number, status: string, extra: Row = {}) => {
    const c = byId.get(id)!;
    return newRow('diary_entries', { user_id: uid, entry_date: date, meal, status, name: c.name, kind: c.kind, state: c.state, basis: c.basis,
      density: c.density ?? null, nutrients: c.nutrients, tags: c.tags, allergens: c.allergens, catalog_id: c.id, source: 'catalog',
      source_ref: c.source_ref, amount, unit: c.basis, planned_amount: status === 'planned' ? amount : null,
      consumed_at: status === 'consumed' ? new Date().toISOString() : null, ...extra });
  };
  for (let n = -6; n <= -1; n++) {
    const d = day(n);
    db.diary_entries.push(e(d, 'breakfast', 'cat-oats-dry', 50, 'consumed'), e(d, 'breakfast', 'cat-milk-2pct', 200, 'consumed'),
      e(d, 'lunch', 'cat-bread-white', 75, 'consumed'), e(d, 'lunch', 'cat-cheddar', 30, 'consumed'),
      e(d, 'dinner', 'cat-pasta-cooked', 250, 'consumed'), e(d, 'dinner', 'cat-chicken-breast-roasted', 120, 'consumed'),
      e(d, 'drinks', 'cat-coffee-brewed', 240, 'consumed'), e(d, 'drinks', 'cat-water', 750, 'consumed'));
  }
  const coffee = e(today, 'drinks', 'cat-coffee-brewed', 240, 'consumed');
  db.diary_entries.push(e(today, 'breakfast', 'cat-oats-dry', 50, 'consumed'), e(today, 'breakfast', 'cat-blueberries', 75, 'consumed'),
    e(today, 'lunch', 'cat-rice-white-cooked', 200, 'planned'), e(today, 'lunch', 'cat-salmon-cooked', 120, 'planned'),
    e(today, 'snacks', 'cat-potato-chips', 40, 'planned'), e(today, 'drinks', 'cat-orange-juice', 330, 'planned'),
    coffee, e(today, 'drinks', 'cat-milk-2pct', 30, 'consumed', { parent_id: coffee.id }));

  const meal = newRow('meals', { name: 'Overnight oats', kind: 'recipe', yield_amount: 2, yield_unit: 'serving', default_meal: 'breakfast', is_favorite: true });
  db.meals.push(meal);
  const items = [['cat-oats-dry', 100], ['cat-greek-yogurt-nonfat', 170], ['cat-milk-2pct', 200], ['cat-blueberries', 100], ['cat-chia-seeds', 20]] as const;
  items.forEach(([id, amount], i) => {
    const c = byId.get(id)!;
    db.meal_items.push(newRow('meal_items', { meal_id: meal.id, position: i, name: c.name, kind: c.kind, state: c.state, basis: c.basis,
      nutrients: c.nutrients, amount, unit: c.basis, tags: c.tags, allergens: c.allergens }));
  });
}
