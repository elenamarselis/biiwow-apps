import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ANON, URL, USERS, addItem, admin, cat, entriesOf, kcal, login, n, reset, setTargets, totals, userId } from './util';

const near = (a: number, b: number, tol = 1.01) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);

test.beforeEach(async () => {
  await reset(USERS.a.email);
});

test('1. set a calorie target, plan a meal and a drink, both appear in projected totals', async ({ page }) => {
  await login(page, 'a');
  await setTargets(page, 2000);
  await page.goto('/today');
  await addItem(page, 'egg hard', /Egg, whole, hard-boiled/, { amount: 100, meal: 'breakfast' });
  await addItem(page, 'orange juice', /Orange juice/, { amount: 250 });

  const expected = kcal('cat-egg-hard-boiled', 100) + kcal('cat-orange-juice', 250);
  await expect(page.getByTestId('entry')).toHaveCount(2);
  const t = await totals(page);
  expect(t.consumed).toBe(0);
  near(t.planned, expected);
  near(t.projected, expected);
  await expect(page.getByTestId('kcal-headline')).toHaveText(`${Math.round(2000 - expected).toLocaleString('en-GB')} kcal left after your plan`);
  await expect(page.getByTestId('meal-drinks').getByText(/Orange juice/)).toBeVisible();
  await expect(page.getByTestId('nbar-fluid_ml')).toContainText('250 projected');
});

test('2. log a different portion; actual and projected update without double counting', async ({ page }) => {
  await login(page, 'a');
  await setTargets(page, 2000);
  await page.goto('/today');
  await addItem(page, 'rice white cooked', /Rice, white.*cooked/, { amount: 300, meal: 'lunch' });
  const per = kcal('cat-rice-white-cooked', 1);
  let t = await totals(page);
  near(t.planned, 300 * per);

  // Had only 200 g; keep the remaining 100 g planned.
  await page.getByRole('button', { name: /More for Rice/ }).click();
  await page.getByRole('button', { name: 'Had a different amount…' }).click();
  await page.getByLabel('Actual amount').fill('200');
  await page.getByRole('button', { name: /Keep the rest planned/ }).click();
  await page.getByRole('button', { name: 'Log 200 g' }).click();
  await expect(page.getByTestId('entry')).toHaveCount(2);

  t = await totals(page);
  near(t.consumed, 200 * per);
  near(t.planned, 100 * per);
  near(t.projected, 300 * per); // same as before: the 200 g moved from plan to actual, counted once
  await expect(page.locator('[data-status=consumed]').getByText('planned 300 g')).toBeVisible();

  const rows = await entriesOf(USERS.a.email);
  expect(rows.map((r) => [r.status, Number(r.amount), r.planned_amount === null ? null : Number(r.planned_amount)])).toEqual([
    ['consumed', 200, 300], ['planned', 100, 100],
  ]);

  // Then had the rest as planned: everything consumed, projection unchanged.
  await page.getByRole('button', { name: /Mark Rice.* as had/ }).click();
  await expect(page.locator('[data-status=planned]')).toHaveCount(0);
  t = await totals(page);
  near(t.consumed, 300 * per);
  expect(t.planned).toBe(0);
  near(t.projected, 300 * per);
});

test('3. exceed the target with a planned drink, preview a substitution, apply: only the plan changes', async ({ page }) => {
  await login(page, 'a');
  await setTargets(page, 800);
  await page.goto('/today');
  await addItem(page, 'pasta cooked', /Pasta.*cooked/, { amount: 450, meal: 'lunch', had: true });
  await addItem(page, 'orange juice', /Orange juice/, { amount: 500 });

  const consumedBefore = (await totals(page)).consumed;
  const over = kcal('cat-pasta-cooked', 450) + kcal('cat-orange-juice', 500) - 800;
  expect(over).toBeGreaterThan(0);
  await expect(page.getByTestId('kcal-headline')).toHaveText(`Projected ${Math.round(over)} kcal over`);
  const before = await entriesOf(USERS.a.email);

  const sugg = page.getByTestId('suggestion').filter({ hasText: /Swap Orange juice/ }).first();
  await expect(sugg).toBeVisible();
  await expect(sugg).toContainText(/Saves \d+ kcal/);

  // Preview changes the numbers on screen but saves nothing.
  await sugg.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByText('Preview: not saved')).toBeVisible();
  const preview = sugg.getByTestId('suggestion-preview');
  await expect(preview).toContainText('Orange juice');
  await expect(preview).toContainText('Calories');
  expect(await entriesOf(USERS.a.email)).toEqual(before);
  const previewProjected = (await totals(page)).projected;
  expect(previewProjected).toBeLessThan(consumedBefore + kcal('cat-orange-juice', 500) - 1);

  await sugg.getByRole('button', { name: 'Apply to plan' }).click();
  await expect(page.getByText('Plan updated')).toBeVisible();
  await expect(page.getByText(/swapped from Orange juice/)).toBeVisible();

  const after = await entriesOf(USERS.a.email);
  const pastaBefore = before.find((r) => r.status === 'consumed')!;
  const pastaAfter = after.find((r) => r.id === pastaBefore.id)!;
  expect({ ...pastaAfter, updated_at: null }).toEqual({ ...pastaBefore, updated_at: null }); // consumed entry untouched
  const drink = after.find((r) => r.status === 'planned')!;
  expect(drink.name).not.toMatch(/Orange juice/);
  expect(drink.swapped_from).toMatch(/Orange juice/);
  expect(Number(drink.amount)).toBe(500);
  const t = await totals(page);
  near(t.consumed, consumedBefore);
  near(t.projected, previewProjected);
});

test('4. calories left but short of a nutrient: realistic portion and calculated impact', async ({ page }) => {
  await login(page, 'a');
  await setTargets(page, 2000, { Protein: 100 });
  await page.goto('/today');
  await addItem(page, 'oats dry', /Oats, rolled, dry/, { amount: 50, meal: 'breakfast', had: true });
  await addItem(page, 'pasta cooked', /Pasta.*cooked/, { amount: 250, meal: 'dinner' });

  const sugg = page.getByTestId('suggestion').filter({ hasText: /protein is \d+(\.\d)? g below your 100 g target/ }).first();
  await expect(sugg).toBeVisible();
  const text = (await sugg.textContent())!;
  const added = Number(/This adds (\d+(?:\.\d)?) g for (\d+) kcal/.exec(text)![1]);
  const addKcal = Number(/This adds [\d.]+ g for (\d+) kcal/.exec(text)![1]);
  expect(addKcal).toBeLessThanOrEqual(2000);

  await sugg.getByRole('button', { name: 'Preview' }).click();
  const impact = sugg.getByTestId('suggestion-preview').locator('.imp', { hasText: 'Protein' });
  const [pb, pa] = ((await impact.textContent())!.match(/([\d.]+) → ([\d.]+)/) ?? []).slice(1).map(Number);
  near(pa - pb, added, 1.5);

  await sugg.getByRole('button', { name: 'Apply to plan' }).click();
  await expect(page.getByText('Plan updated')).toBeVisible();
  const rows = await entriesOf(USERS.a.email);
  const add = rows.find((r) => r.status === 'planned' && !/Pasta/.test(r.name))!;
  // realistic portion: no more than the item's realistic serving cap
  const catItem = cat(add.catalog_id) as unknown as { max_amount: number; default_amount: number } | undefined;
  if (catItem) expect(Number(add.amount)).toBeLessThanOrEqual(Math.max(catItem.max_amount, catItem.default_amount * 1.5));
  const proj = n((await page.getByTestId('nbar-protein_g').textContent())!.match(/([\d.]+) projected/)![1]);
  near(proj, pa, 1);
});

test('5. packaged food with missing vitamin data marks totals incomplete', async ({ page }) => {
  await login(page, 'a');
  await setTargets(page, 2000, { 'Vitamin C': 90 });
  await page.goto('/settings');
  await page.getByRole('region', { name: 'Dashboard' }).getByRole('button', { name: 'Vitamin C' }).click();
  await page.getByRole('region', { name: 'Dashboard' }).getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('region', { name: 'Dashboard' }).getByText('Saved.')).toBeVisible();

  await page.goto('/today');
  await addItem(page, 'orange', /^Orange, raw/, { amount: 140, meal: 'snacks', had: true });
  await expect(page.getByTestId('incomplete-vitamin_c_mg')).toHaveCount(0);

  // Packaged product from Open Food Facts (offline fixture through the real mapper): no vitamin values.
  await page.getByRole('button', { name: /Add food or drink/ }).click();
  await page.getByRole('button', { name: 'Barcode / packaged' }).click();
  await page.getByLabel('Barcode').fill('5000000000017');
  await page.getByRole('button', { name: 'Look up' }).click();
  await expect(page.getByRole('heading', { name: 'Oat & honey bar' })).toBeVisible();
  await expect(page.getByText(/Unknown for this item: .*Vitamin/)).toBeVisible();
  await page.getByRole('button', { name: 'Already ate' }).click();
  await page.getByRole('button', { name: 'Log it' }).click();

  await expect(page.getByTestId('incomplete-vitamin_c_mg')).toBeVisible();
  await expect(page.getByTestId('incomplete-protein_g')).toHaveCount(0); // protein is on the label
  await page.getByTestId('nbar-vitamin_c_mg').click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('Incomplete: Oat & honey bar has no vitamin C value');
  await expect(dlg.locator('tr', { hasText: 'Oat & honey bar' })).toContainText('unknown');

  // CSV keeps unknown as blank, not zero.
  const res = await page.request.get('/api/export');
  const csv = await res.text();
  const head = csv.split('\r\n')[0].split(',');
  const bar = csv.split('\r\n').find((l) => l.includes('Oat & honey bar'))!.split(',');
  expect(bar[head.indexOf('vitamin_c_mg')]).toBe('');
  expect(Number(bar[head.indexOf('energy_kcal')])).toBe(168);
});

test('6. second device sees the same diary; a separate account cannot read it', async ({ page, browser }) => {
  await login(page, 'a');
  await setTargets(page, 2000);
  await page.goto('/today');
  await addItem(page, 'banana', /Banana/, { amount: 118, meal: 'snacks' });

  // second device: separate browser context (desktop)
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'UTC' });
  const p2 = await desktop.newPage();
  await login(p2, 'a');
  await expect(p2.getByTestId('entry').filter({ hasText: 'Banana' })).toBeVisible();
  // change on device 2 shows on device 1
  await p2.getByRole('button', { name: /Mark Banana.* as had/ }).click();
  await expect(p2.locator('[data-status=consumed]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('[data-status=consumed][data-name^="Banana"]')).toBeVisible();
  near((await totals(page)).consumed, kcal('cat-banana', 118));
  await desktop.close();

  // another account sees nothing in the UI
  const other = await browser.newContext({ timezoneId: 'UTC' });
  const p3 = await other.newPage();
  await login(p3, 'b');
  await expect(p3.getByTestId('meal-snacks')).toBeVisible();
  await expect(p3.getByTestId('entry')).toHaveCount(0);
  const csv = await (await p3.request.get('/api/export')).text();
  expect(csv).not.toContain('Banana');
  await other.close();

  // ...and cannot read or change it through the API either (RLS)
  const ownerRow = (await entriesOf(USERS.a.email))[0];
  const sb = createClient(URL, ANON, { auth: { persistSession: false } });
  await sb.auth.signInWithPassword(USERS.b);
  const read = await sb.from('diary_entries').select('*').eq('id', ownerRow.id);
  expect(read.data).toEqual([]);
  const all = await sb.from('diary_entries').select('id');
  expect(all.data).toEqual([]);
  const upd = await sb.from('diary_entries').update({ amount: 1 }).eq('id', ownerRow.id).select();
  expect(upd.data).toEqual([]);
  const del = await sb.from('diary_entries').delete().eq('id', ownerRow.id).select();
  expect(del.data).toEqual([]);
  const ins = await sb.from('diary_entries').insert({ user_id: await userId(USERS.a.email), entry_date: '2026-01-01', meal: 'snacks', name: 'x', basis: 'g', unit: 'g', amount: 1, nutrients: {} });
  expect(ins.error?.message).toMatch(/row-level security/);
  for (const t of ['targets', 'foods', 'profiles', 'meals']) expect((await sb.from(t).select('*').neq('user_id', (await sb.auth.getUser()).data.user!.id)).data).toEqual([]);
  // unchanged for the owner
  expect(Number((await entriesOf(USERS.a.email))[0].amount)).toBe(118);
  // anonymous: nothing
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  expect((await anon.from('diary_entries').select('*')).data ?? []).toEqual([]);
});

test('7. personal targets from age, sex, height and weight; avoided foods are flagged and never suggested', async ({ page }) => {
  await login(page, 'a');
  await page.goto('/settings');
  const about = page.getByRole('region', { name: 'About you' });
  await about.getByLabel('Birth year').fill(String(new Date().getFullYear() - 35));
  await about.getByRole('button', { name: 'Female' }).click();
  await about.getByLabel('Height in cm').fill('168');
  await about.getByLabel('Weight in kg').fill('70');
  await about.getByLabel('Activity').selectOption('light');
  await about.getByLabel('Daily calorie goal').fill('1600');
  const rec = about.getByTestId('recommended');
  await expect(rec.locator('.recrow', { hasText: 'Iron' })).toContainText('18 mg');
  await expect(rec.locator('.recrow', { hasText: 'Vitamin D' })).toContainText('15 µg');
  await expect(rec.locator('.recrow', { hasText: 'Protein' })).toContainText('84 g');
  await expect(about.getByTestId('energy')).toContainText('1,414');
  await about.getByRole('button', { name: 'Use these as my daily targets' }).click();
  await expect(about.getByText(/Saved as your targets from today/)).toBeVisible();

  const prefs = page.getByRole('region', { name: 'Preferences' });
  await prefs.getByRole('button', { name: "Cow's milk dairy" }).click();
  await prefs.getByRole('button', { name: 'Pork' }).click();
  await prefs.getByRole('button', { name: 'Save preferences' }).click();
  await expect(prefs.getByText('Saved.')).toBeVisible();

  const { data: t } = await admin().from('targets').select('*').eq('user_id', await userId(USERS.a.email));
  const row = t!.at(-1)!;
  expect(Number(row.calories)).toBe(1600);
  expect(row.nutrients.iron_mg.min).toBe(18);
  expect(row.nutrients.calcium_mg.min).toBe(1000);
  expect(Number(row.fluid_ml)).toBe(2200);

  await page.goto('/today');
  await expect(page.getByTestId('nbar-vitamin_d_ug')).toBeVisible();
  await page.getByRole('button', { name: /Add food or drink/ }).click();
  await page.getByLabel('Search foods and drinks').fill('cheddar');
  await page.getByRole('dialog').getByRole('button', { name: /Cheese, cheddar/ }).first().click();
  await expect(page.getByTestId('avoid-warning')).toContainText("Cow's milk dairy");
  await page.getByRole('button', { name: 'Close' }).click();

  for (const s of await page.getByTestId('suggestion').allTextContents()) {
    expect(s).not.toMatch(/milk|cheese|yogurt|cheddar|pork|bacon|ham\b/i);
  }
});

test('8. without planning, everything added is logged as eaten (no planned step)', async ({ page }) => {
  const uid = await userId(USERS.a.email);
  await admin().from('profiles').update({ planning: false }).eq('user_id', uid);
  // A leftover planned item from before planning was switched off is turned into eaten.
  await admin().from('diary_entries').insert({ user_id: uid, entry_date: new Date().toISOString().slice(0, 10), meal: 'drinks', status: 'planned',
    name: 'Leftover planned juice', kind: 'drink', basis: 'ml', unit: 'ml', amount: 240, planned_amount: 240, nutrients: { energy_kcal: 45 } });
  await login(page, 'a');
  await expect(page.locator('[data-name="Leftover planned juice"][data-status=consumed]')).toBeVisible();
  await expect(page.getByTestId('kcal-planned')).toHaveCount(0);
  await admin().from('diary_entries').delete().eq('user_id', uid);
  await setTargets(page, 2000, { Protein: 120 });
  await page.goto('/today');
  await page.getByRole('button', { name: /Add food or drink/ }).click();
  await page.getByLabel('Search foods and drinks').fill('poached');
  await page.getByRole('dialog').getByRole('button', { name: /Egg, whole, poached/ }).first().click();
  await expect(page.getByRole('group', { name: 'Planned or had' })).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Log it' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const egg = (await entriesOf(USERS.a.email))[0];
  expect(egg.status).toBe('consumed');
  await expect(page.getByTestId('kcal-planned')).toHaveCount(0);
  const eaten = n(await page.getByTestId('kcal-consumed').textContent());
  expect(eaten).toBeGreaterThan(0);
  near(n(await page.getByTestId('kcal-left').textContent()), 2000 - eaten);
  await expect(page.getByTestId('kcal-headline')).toContainText('kcal left today');
  await expect(page.locator('[data-status=consumed]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Mark .* as had/ })).toHaveCount(0);

  await page.getByTestId('add-water').click();
  await expect(page.getByTestId('nbar-fluid_ml')).toContainText('250');

  // Taking a gap-filling food logs it as eaten.
  const first = page.getByTestId('gap-filler').locator('.bitem').first();
  await first.getByRole('button', { name: /^Log / }).click();
  await expect(page.getByText(/^Logged /).first()).toBeVisible();
  await expect.poll(async () => (await entriesOf(USERS.a.email)).length).toBe(3);
  const rows = await entriesOf(USERS.a.email);
  expect(rows.every((r) => r.status === 'consumed')).toBe(true);
});

test('9. fill my gaps logs low-calorie foods for missing nutrients; calories are tracked over time', async ({ page }) => {
  const uid = await userId(USERS.a.email);
  await admin().from('profiles').update({ planning: false, diet: ['no_dairy', 'no_pork'], birth_year: new Date().getFullYear() - 35, sex: 'female', height_cm: 168, weight_kg: 70, activity: 'light' }).eq('user_id', uid);
  await admin().from('targets').insert({ user_id: uid, effective_date: '2026-01-01', calories: 1600, fluid_ml: 2200,
    nutrients: { protein_g: { min: 84 }, fiber_g: { min: 22 }, vitamin_c_mg: { min: 75 }, folate_ug: { min: 400 }, iron_mg: { min: 18 }, magnesium_mg: { min: 320 }, potassium_mg: { min: 2600 }, calcium_mg: { min: 1000 }, sodium_mg: { max: 2300 } } });
  await login(page, 'a');
  await addItem(page, 'oats dry', /Oats, rolled, dry/, { amount: 50, meal: 'breakfast' });

  const card = page.getByTestId('gap-filler');
  await expect(card).toContainText(/short on \d+ nutrients/);
  const items = card.locator('.bitem');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(3);
  const total = n((await card.getByRole('button', { name: /Log all/ }).textContent())!.match(/\(([\d,]+) kcal\)/)![1]);
  expect(total).toBeLessThanOrEqual(1600);
  for (const t of await items.allTextContents()) expect(t).not.toMatch(/milk|cheese|yogurt|pork|bacon|ham\b/i);
  const before = n(await page.getByTestId('kcal-consumed').textContent());
  await card.getByRole('button', { name: /Log all/ }).click();
  await expect(page.getByText(`Logged ${count} foods`)).toBeVisible();
  const rows = await entriesOf(USERS.a.email);
  expect(rows.length).toBe(1 + count);
  expect(rows.every((r) => r.status === 'consumed')).toBe(true);
  near(n(await page.getByTestId('kcal-consumed').textContent()), before + total, 2);

  await page.getByRole('link', { name: 'Progress' }).click();
  const stats = page.getByTestId('calorie-stats');
  await expect(stats).toContainText('1 day logged, including today (in progress)');
  near(n(await stats.getByTestId('today-kcal').textContent()), before + total, 2);
  await expect(stats).toContainText('no finished days yet');
  await page.getByRole('button', { name: '30 days' }).click();
  await expect(stats).toContainText('1 day logged, including today (in progress)');
});

test('10. search finds everyday foods however typed; a new food can be filled in from the catalogue', async ({ page }) => {
  await admin().from('profiles').update({ planning: false }).eq('user_id', await userId(USERS.a.email));
  await login(page, 'a');
  await setTargets(page, 1800);
  await page.goto('/today');
  await page.getByRole('button', { name: /Add food or drink/ }).click();
  const dlg = page.getByRole('dialog');
  for (const [q, expected] of [['poached eggs', /Egg, whole, poached/], ['tomatoes', /Tomato/], ['yoghurt', /yogurt/i], ['prawns', /Shrimp/]] as const) {
    await page.getByLabel('Search foods and drinks').fill(q);
    await expect(dlg.getByRole('button', { name: expected }).first()).toBeVisible();
  }

  // Create a custom food starting from a catalogue item.
  await page.getByLabel('Search foods and drinks').fill('');
  await dlg.getByRole('button', { name: '+ Create custom' }).click();
  await dlg.getByRole('textbox', { name: 'Name', exact: true }).fill('poached egg');
  const matches = dlg.getByTestId('catalog-matches');
  await matches.getByRole('button', { name: /Egg, whole, poached/ }).click();
  await expect(dlg.getByText(/Values filled in from/)).toBeVisible();
  await expect(dlg.getByLabel('Calories (kcal)')).not.toHaveValue('');
  await expect(dlg.getByLabel('Protein (g)')).not.toHaveValue('');
  await dlg.getByRole('textbox', { name: 'Name', exact: true }).fill('My poached egg');
  await dlg.getByRole('button', { name: 'Save food' }).click();
  await expect(dlg.getByRole('heading', { name: 'My poached egg' })).toBeVisible();
  await dlg.getByRole('button', { name: 'Log it' }).click();
  await expect(page.locator('[data-name="My poached egg"][data-status=consumed]')).toBeVisible();
  const food = (await admin().from('foods').select('*').eq('user_id', await userId(USERS.a.email)).eq('name', 'My poached egg').single()).data!;
  expect(food.nutrients.energy_kcal).toBeGreaterThan(100);
});
