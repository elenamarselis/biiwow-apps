'use client';
// Calls that normally go to this app's server routes. In the static demo build there is
// no server, so they run in the browser instead (food lookups use the bundled samples).
import { DEMO, NO_SERVER, STATIC } from './demo/mode';
import { supabase } from './supabase/client';
import type { FoodLike } from './types';

export async function searchOnline(q: string): Promise<{ results: FoodLike[]; errors: string[] }> {
  if (DEMO) {
    const { mockSearch } = await import('./sources/mock');
    return { results: mockSearch(q), errors: ['Demo: online search shows a few sample USDA / Open Food Facts results.'] };
  }
  const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`, { headers: await authHeaders() });
  const json = (await res.json()) as { results?: FoodLike[]; errors?: string[]; error?: string };
  return { results: json.results ?? [], errors: json.errors ?? (json.error ? [json.error] : []) };
}

export async function lookupBarcode(code: string): Promise<FoodLike> {
  if (DEMO) {
    const { mockBarcode } = await import('./sources/mock');
    const f = mockBarcode(code);
    if (!f) throw new Error('Demo: only the sample barcode 5000000000017 is available. Enter other products from the label.');
    return f;
  }
  const res = await fetch(`/api/foods/barcode?code=${encodeURIComponent(code)}`, { headers: await authHeaders() });
  const json = (await res.json()) as { food?: FoodLike; error?: string };
  if (!res.ok || !json.food) throw new Error(json.error ?? 'Not found');
  return json.food;
}

export async function exportCsv() {
  if (!NO_SERVER) { window.location.href = '/api/export'; return; }
  const { loadEntries } = await import('./data');
  const { diaryCsv } = await import('./csv');
  const csv = diaryCsv(await loadEntries('1900-01-01', '2999-12-31'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `plate-diary-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function deleteMyData(account: boolean): Promise<{ account: boolean; note?: string }> {
  if (NO_SERVER) {
    // RLS-protected function that deletes only the caller's rows.
    const { error } = await supabase().rpc('delete_my_data');
    if (error) throw new Error(error.message);
    return { account: false, note: DEMO ? 'Demo data deleted from this browser.' : 'Your data has been deleted. Your login stays; remove it in Supabase (Authentication → Users) if you want.' };
  }
  const res = await fetch('/api/account/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE', account }) });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error);
  return j;
}

/** On Cloudflare Pages the food-search functions check the Supabase session from this header. */
async function authHeaders(): Promise<Record<string, string>> {
  if (!STATIC) return {};
  const { data } = await supabase().auth.getSession();
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
}
