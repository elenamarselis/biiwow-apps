import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { expect, type Page } from '@playwright/test';
import catalog from '../../data/catalog.json';
config({ path: '.env.local' });

export const USERS = {
  a: { email: 'e2e-owner@example.test', password: 'owner-password-123' },
  b: { email: 'e2e-other@example.test', password: 'other-password-456' },
};
export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function admin() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function userId(email: string) {
  const { data } = await admin().auth.admin.listUsers();
  return data.users.find((u) => u.email === email)!.id;
}
/** Wipe a test user's data (admin, test-only) so each flow starts clean. */
export async function reset(email: string) {
  const id = await userId(email);
  const sb = admin();
  for (const t of ['diary_entries', 'meal_items', 'meals', 'foods', 'targets']) await sb.from(t).delete().eq('user_id', id);
  await sb.from('profiles').update({ dashboard_nutrients: ['protein_g', 'fiber_g', 'fluid_ml'], diet: [], allergies: [], avoid_ingredients: [], liked_foods: [], timezone: 'UTC' }).eq('user_id', id);
  return id;
}
export async function entriesOf(email: string) {
  const { data } = await admin().from('diary_entries').select('*').eq('user_id', await userId(email)).order('created_at');
  return data ?? [];
}
export const today = () => new Date().toISOString().slice(0, 10);

export const cat = (id: string) => {
  const c = (catalog as unknown as { id: string; name: string; nutrients: Record<string, number> }[]).find((x) => x.id === id);
  return c;
};
export const kcal = (id: string, amount: number) => (cat(id)!.nutrients.energy_kcal * amount) / 100;
export const n = (s: string | null) => Number((s ?? '').replace(/[^\d.-]/g, ''));
export const round = (x: number) => Math.round(x);

export async function login(page: Page, who: keyof typeof USERS) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(USERS[who].email);
  await page.getByLabel('Password').fill(USERS[who].password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/today');
}

export async function setTargets(page: Page, calories: number, mins: Record<string, number> = {}) {
  await page.goto('/settings');
  await page.getByLabel('Daily calorie target').fill(String(calories));
  if (Object.keys(mins).length) {
    await page.getByText('Nutrients to reach (optional)').click();
    for (const [label, v] of Object.entries(mins)) await page.getByLabel(`${label} target`).fill(String(v));
  }
  await page.getByRole('button', { name: 'Save targets' }).click();
  await expect(page.getByText(/Saved\. These targets apply from/)).toBeVisible();
}

/** Uses the Add sheet exactly as a person would. */
export async function addItem(page: Page, query: string, resultName: string | RegExp, opts: { amount: number; meal?: string; had?: boolean }) {
  await page.getByRole('button', { name: /Add food or drink/ }).click();
  await page.getByLabel('Search foods and drinks').fill(query);
  await page.getByRole('dialog').getByRole('button', { name: resultName }).first().click();
  const unitBtn = page.getByRole('group', { name: 'Portion' }).getByRole('button', { name: /^(g|ml|servings)$/ });
  if (await unitBtn.count()) await unitBtn.click();
  await page.getByLabel(/Amount in (g|ml|servings)/).fill(String(opts.amount));
  if (opts.meal) await page.getByRole('dialog').getByLabel('Meal').selectOption(opts.meal);
  if (opts.had) await page.getByRole('button', { name: /Already (ate|drank)/ }).click();
  await page.getByRole('button', { name: opts.had ? 'Log it' : 'Add to plan' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

export async function totals(page: Page) {
  return {
    consumed: n(await page.getByTestId('kcal-consumed').textContent()),
    planned: n(await page.getByTestId('kcal-planned').textContent()),
    projected: n(await page.getByTestId('kcal-projected').textContent()),
  };
}
