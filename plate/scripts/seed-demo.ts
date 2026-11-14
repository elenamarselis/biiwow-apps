// Small demo dataset, separate from the migrations. Creates (or reuses) a demo account
// and fills the last week with a few days of meals, a plan for today, targets and preferences.
//   npm run demo:seed -- [--email demo@example.com] [--password 'demo-plate-2026']
import catalog from '../data/catalog.json';
import { admin, arg } from './env';

type Cat = (typeof catalog)[number];
const byId = new Map<string, Cat>(catalog.map((c) => [c.id, c]));
const today = new Date().toISOString().slice(0, 10);
const day = (n: number) => { const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

async function main() {
  const email = arg('email') ?? 'demo@example.com';
  const password = arg('password') ?? 'demo-plate-2026';
  const sb = admin();
  const { data: list } = await sb.auth.admin.listUsers();
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }
  const uid = user.id;
  for (const t of ['diary_entries', 'meal_items', 'meals', 'foods', 'targets']) await sb.from(t).delete().eq('user_id', uid);

  await sb.from('profiles').upsert({ user_id: uid, display_name: 'Demo', timezone: 'Europe/London',
    dashboard_nutrients: ['protein_g', 'fiber_g', 'fluid_ml', 'sugar_g', 'vitamin_c_mg', 'caffeine_mg'],
    diet: [], allergies: ['peanuts'], avoid_ingredients: ['coriander'], liked_foods: ['yogurt', 'berries'] });
  await sb.from('targets').insert([
    { user_id: uid, effective_date: day(-30), calories: 2100, nutrients: { protein_g: { min: 90 }, fiber_g: { min: 28 } }, fluid_ml: 2000 },
    { user_id: uid, effective_date: day(-3), calories: 1900, fluid_ml: 2000,
      nutrients: { protein_g: { min: 100 }, fiber_g: { min: 30 }, vitamin_c_mg: { min: 90 }, sugar_g: { max: 50 }, caffeine_mg: { max: 300 } } },
  ]);
  // foods at home / favourites
  const flags: [string, boolean, boolean][] = [['cat-greek-yogurt-nonfat', true, true], ['cat-blueberries', true, true], ['cat-lentils-cooked', false, true],
    ['cat-coffee-brewed', true, false], ['cat-sparkling-water', true, true], ['cat-egg-hard-boiled', false, true]];
  await sb.from('foods').insert(flags.map(([id, fav, home]) => {
    const c = byId.get(id)!;
    return { user_id: uid, name: c.name, kind: c.kind, state: c.state, basis: c.basis, density: (c as { density?: number }).density ?? null,
      source: 'catalog', source_id: c.id, source_ref: c.source_ref, nutrients: c.nutrients, portions: c.portions, default_amount: c.default_amount,
      max_amount: c.max_amount, tags: c.tags, allergens: c.allergens, is_favorite: fav, at_home: home };
  }));
  // a packaged snack entered from its label, without vitamin values
  await sb.from('foods').insert({ user_id: uid, name: 'Oat & honey bar', brand: 'Local bakery', kind: 'food', basis: 'g', source: 'label',
    source_ref: 'Entered from label', nutrients: { energy_kcal: 420, protein_g: 7.5, carbs_g: 62, sugar_g: 24, fat_g: 15, fiber_g: 6.2, sodium_mg: 200 },
    portions: [{ label: '1 bar', amount: 40 }], default_amount: 40, max_amount: 80, tags: ['snack', 'sweet'], allergens: ['gluten'] });

  const e = (date: string, meal: string, id: string, amount: number, status: string, extra: Record<string, unknown> = {}) => {
    const c = byId.get(id)!;
    return { user_id: uid, entry_date: date, meal, status, name: c.name, kind: c.kind, state: c.state, basis: c.basis,
      density: (c as { density?: number }).density ?? null, nutrients: c.nutrients, tags: c.tags, allergens: c.allergens, catalog_id: c.id,
      source: 'catalog', source_ref: c.source_ref, amount, unit: c.basis, planned_amount: status === 'planned' ? amount : null,
      consumed_at: status === 'consumed' ? new Date().toISOString() : null, ...extra };
  };
  const rows: ReturnType<typeof e>[] = [];
  for (let n = -6; n <= -1; n++) {
    const d = day(n);
    rows.push(e(d, 'breakfast', 'cat-oats-dry', 50, 'consumed'), e(d, 'breakfast', 'cat-milk-2pct', 200, 'consumed'),
      e(d, 'lunch', 'cat-bread-white', 75, 'consumed'), e(d, 'lunch', 'cat-cheddar', 30, 'consumed'),
      e(d, 'dinner', 'cat-pasta-cooked', 250, 'consumed'), e(d, 'dinner', 'cat-chicken-breast-roasted', 120, 'consumed'),
      e(d, 'drinks', 'cat-coffee-brewed', 240, 'consumed'), e(d, 'drinks', 'cat-water', 750, 'consumed'));
  }
  rows.push(e(today, 'breakfast', 'cat-oats-dry', 50, 'consumed'), e(today, 'breakfast', 'cat-blueberries', 75, 'consumed'),
    e(today, 'lunch', 'cat-rice-white-cooked', 200, 'planned'), e(today, 'lunch', 'cat-salmon-cooked', 120, 'planned'),
    e(today, 'snacks', 'cat-potato-chips', 40, 'planned'), e(today, 'drinks', 'cat-orange-juice', 330, 'planned'));
  const { error } = await sb.from('diary_entries').insert(rows);
  if (error) throw error;
  const { data: coffee } = await sb.from('diary_entries').insert(e(today, 'drinks', 'cat-coffee-brewed', 240, 'consumed')).select('id').single();
  await sb.from('diary_entries').insert(e(today, 'drinks', 'cat-milk-2pct', 30, 'consumed', { parent_id: coffee!.id }));
  await sb.from('meals').insert({ user_id: uid, name: 'Overnight oats', kind: 'recipe', yield_amount: 2, yield_unit: 'serving', default_meal: 'breakfast', is_favorite: true })
    .select('id').single().then(async ({ data }) => {
      const items = [['cat-oats-dry', 100], ['cat-greek-yogurt-nonfat', 170], ['cat-milk-2pct', 200], ['cat-blueberries', 100], ['cat-chia-seeds', 20]] as const;
      await sb.from('meal_items').insert(items.map(([id, amount], i) => {
        const c = byId.get(id)!;
        return { user_id: uid, meal_id: data!.id, position: i, name: c.name, kind: c.kind, state: c.state, basis: c.basis, nutrients: c.nutrients, amount, unit: c.basis, tags: c.tags, allergens: c.allergens };
      }));
    });
  console.log(`Demo data ready for ${email} (password: ${password}).`);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
