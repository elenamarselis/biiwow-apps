'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/AppData';
import * as data from '@/lib/data';
import { supabase } from '@/lib/supabase/client';
import { targetsFor } from '@/lib/day';
import { DASHBOARD_CHOICES, label, unitOf, type MetricKey } from '@/lib/nutrients';
import type { TargetSpec, Targets } from '@/lib/types';

const MIN_KEYS: MetricKey[] = ['protein_g', 'fiber_g', 'carbs_g', 'fat_g', 'calcium_mg', 'iron_mg', 'magnesium_mg', 'potassium_mg', 'zinc_mg',
  'vitamin_a_ug', 'vitamin_c_mg', 'vitamin_d_ug', 'vitamin_e_mg', 'vitamin_k_ug', 'vitamin_b6_mg', 'vitamin_b12_ug', 'folate_ug'];
const MAX_KEYS: MetricKey[] = ['sugar_g', 'sodium_mg', 'sat_fat_g', 'fat_g', 'carbs_g', 'caffeine_mg', 'alcohol_g'];
const DIETS = ['vegetarian', 'vegan', 'pescatarian', 'no_alcohol'];
const ALLERGENS = ['milk', 'egg', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'wheat', 'gluten', 'soy', 'sesame'];

export default function SettingsPage() {
  const app = useApp();
  if (!app.ready) return <div className="card"><div className="skeleton" /></div>;
  return (
    <>
      <h1>Settings</h1>
      <TargetsCard />
      <DashboardCard />
      <PrefsCard />
      <DataCard />
    </>
  );
}

function TargetsCard() {
  const app = useApp();
  const current = targetsFor(app.targets, app.today);
  const [eff, setEff] = useState(app.today);
  const [kcal, setKcal] = useState(String(current?.calories ?? ''));
  const [fluid, setFluid] = useState(String(current?.fluid_ml ?? ''));
  const [mode, setMode] = useState<Targets['fluid_mode']>(current?.fluid_mode ?? 'all_drinks');
  const [mins, setMins] = useState<Record<string, string>>(() => pick(current, 'min'));
  const [maxs, setMaxs] = useState<Record<string, string>>(() => pick(current, 'max'));
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const c = Number(kcal);
    if (!(c > 0 && c < 20000)) return setMsg({ err: 'Enter a daily calorie target.' });
    const nutrients: Partial<Record<MetricKey, TargetSpec>> = {};
    for (const [k, v] of Object.entries(mins)) if (Number(v) > 0) nutrients[k as MetricKey] = { ...(nutrients[k as MetricKey] ?? {}), min: Number(v) };
    for (const [k, v] of Object.entries(maxs)) if (Number(v) > 0) nutrients[k as MetricKey] = { ...(nutrients[k as MetricKey] ?? {}), max: Number(v) };
    setBusy(true);
    try {
      await data.saveTargets({ effective_date: eff, calories: c, nutrients, fluid_ml: Number(fluid) > 0 ? Number(fluid) : null, fluid_mode: mode });
      await app.reload(['targets']);
      setMsg({ ok: `Saved. These targets apply from ${eff}; earlier days keep the targets you had then.` });
    } catch (err) { setMsg({ err: (err as Error).message }); }
    setBusy(false);
  }

  const row = (k: MetricKey, kind: 'min' | 'max') => {
    const st = kind === 'min' ? mins : maxs;
    const set = kind === 'min' ? setMins : setMaxs;
    return (
      <label className="field" key={`${kind}-${k}`}>
        <span>{label(k)} <span className="muted tiny">{kind === 'min' ? 'at least' : 'at most'}, {unitOf(k)}</span></span>
        <input type="number" inputMode="decimal" step="any" min="0" value={st[k] ?? ''} placeholder="—" aria-label={`${label(k)} ${kind === 'min' ? 'target' : 'limit'}`}
          onChange={(e) => set({ ...st, [k]: e.target.value })} />
      </label>
    );
  };

  return (
    <form className="card stack" onSubmit={save} id="targets" aria-label="Targets">
      <h2>Daily targets</h2>
      <label className="field">Daily calories (kcal)
        <input type="number" inputMode="numeric" min="1" value={kcal} onChange={(e) => setKcal(e.target.value)} required aria-label="Daily calorie target" />
      </label>
      <div className="row">
        <label className="field grow">Fluids (ml, optional)
          <input type="number" inputMode="numeric" min="0" value={fluid} onChange={(e) => setFluid(e.target.value)} aria-label="Fluid target" />
        </label>
        <label className="field grow">Counts
          <select value={mode} onChange={(e) => setMode(e.target.value as Targets['fluid_mode'])}>
            <option value="all_drinks">All drinks</option><option value="water_only">Water only</option>
          </select>
        </label>
      </div>
      <details>
        <summary style={{ fontWeight: 800, cursor: 'pointer' }}>Nutrients to reach (optional)</summary>
        <div className="nutgrid" style={{ marginTop: 8 }}>{MIN_KEYS.map((k) => row(k, 'min'))}</div>
      </details>
      <details>
        <summary style={{ fontWeight: 800, cursor: 'pointer' }}>Limits, including drink limits (optional)</summary>
        <div className="nutgrid" style={{ marginTop: 8 }}>{MAX_KEYS.map((k) => row(k, 'max'))}</div>
      </details>
      <label className="field">Effective from
        <input type="date" value={eff} onChange={(e) => setEff(e.target.value)} />
      </label>
      {msg.err && <p className="err" role="alert">{msg.err}</p>}
      {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
      <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save targets'}</button>
      {app.targets.length > 0 && (
        <details>
          <summary className="small" style={{ cursor: 'pointer' }}>Target history ({app.targets.length})</summary>
          <table className="t" style={{ marginTop: 6 }}>
            <thead><tr><th>From</th><th className="n">kcal</th><th>Other</th></tr></thead>
            <tbody>{[...app.targets].reverse().map((t) => (
              <tr key={t.effective_date}><td>{t.effective_date}</td><td className="n">{t.calories}</td>
                <td className="small">{[t.fluid_ml ? `fluids ${t.fluid_ml} ml` : null, ...Object.entries(t.nutrients).map(([k, v]) =>
                  `${label(k as MetricKey)} ${v?.min ? '≥' + v.min : ''}${v?.max ? '≤' + v.max : ''}`)].filter(Boolean).join(', ') || '—'}</td></tr>
            ))}</tbody>
          </table>
        </details>
      )}
    </form>
  );
}

function pick(t: Targets | null, kind: 'min' | 'max'): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(t?.nutrients ?? {})) if (v?.[kind]) o[k] = String(v[kind]);
  return o;
}

function DashboardCard() {
  const app = useApp();
  const [sel, setSel] = useState<MetricKey[]>(app.profile?.dashboard_nutrients ?? []);
  const [saved, setSaved] = useState(false);
  const toggle = (k: MetricKey) => { setSaved(false); setSel(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]); };
  return (
    <section className="card stack" aria-label="Dashboard">
      <h2>On my Today screen</h2>
      <p className="muted small">Calories always show. Choose which other totals appear.</p>
      <div className="row wrap">{DASHBOARD_CHOICES.map((k) => (
        <button key={k} className="chip" aria-pressed={sel.includes(k)} onClick={() => toggle(k)}>{label(k)}</button>
      ))}</div>
      <button className="btn primary" onClick={async () => { await data.saveProfile({ dashboard_nutrients: sel }); await app.reload(['profile']); setSaved(true); }}>Save</button>
      {saved && <p className="ok">Saved.</p>}
    </section>
  );
}

function PrefsCard() {
  const app = useApp();
  const p = app.profile!;
  const [diet, setDiet] = useState(p.diet);
  const [allergies, setAllergies] = useState(p.allergies);
  const [avoid, setAvoid] = useState(p.avoid_ingredients.join(', '));
  const [liked, setLiked] = useState(p.liked_foods.join(', '));
  const [tz, setTz] = useState(p.timezone);
  const [name, setName] = useState(p.display_name ?? '');
  const [saved, setSaved] = useState(false);
  const browserTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
  useEffect(() => { if (p.timezone === 'UTC' && browserTz !== 'UTC') setTz(browserTz); }, [p.timezone, browserTz]);
  const t = (list: string[], set: (v: string[]) => void, x: string) => { setSaved(false); set(list.includes(x) ? list.filter((y) => y !== x) : [...list, x]); };
  const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  return (
    <section className="card stack" aria-label="Preferences">
      <h2>Preferences</h2>
      <label className="field">Name<input type="text" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <fieldset className="stack tight" style={{ border: 0, padding: 0 }}>
        <legend className="eyebrow">Diet</legend>
        <div className="row wrap">{DIETS.map((d) => <button key={d} className="chip" aria-pressed={diet.includes(d)} onClick={() => t(diet, setDiet, d)}>{d.replace('_', ' ')}</button>)}</div>
      </fieldset>
      <fieldset className="stack tight" style={{ border: 0, padding: 0 }}>
        <legend className="eyebrow">Allergies</legend>
        <div className="row wrap">{ALLERGENS.map((d) => <button key={d} className="chip" aria-pressed={allergies.includes(d)} onClick={() => t(allergies, setAllergies, d)}>{d.replace('_', ' ')}</button>)}</div>
      </fieldset>
      <label className="field">Ingredients I avoid <span className="muted tiny">comma-separated, e.g. coriander, mushrooms</span>
        <input type="text" value={avoid} onChange={(e) => setAvoid(e.target.value)} /></label>
      <label className="field">Foods I like <span className="muted tiny">used to rank suggestions</span>
        <input type="text" value={liked} onChange={(e) => setLiked(e.target.value)} /></label>
      <label className="field">Time zone for my diary dates
        <input type="text" value={tz} onChange={(e) => setTz(e.target.value)} list="tzs" /></label>
      <datalist id="tzs"><option value={browserTz} /></datalist>
      <p className="muted tiny">Foods at home and favourites are set on each food (Foods tab, or when adding).</p>
      <button className="btn primary" onClick={async () => {
        let zone = tz.trim() || 'UTC';
        try { new Intl.DateTimeFormat('en', { timeZone: zone }); } catch { zone = browserTz; }
        await data.saveProfile({ display_name: name.trim() || null, diet, allergies, avoid_ingredients: split(avoid), liked_foods: split(liked), timezone: zone });
        await app.reload(['profile']);
        setSaved(true);
      }}>Save preferences</button>
      {saved && <p className="ok">Saved.</p>}
    </section>
  );
}

function DataCard() {
  const [confirm, setConfirm] = useState('');
  const [account, setAccount] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { supabase().auth.getUser().then(({ data: d }) => setEmail(d.user?.email ?? null)); }, []);
  return (
    <section className="card stack" aria-label="Your data">
      <h2>Your data</h2>
      {email && <p className="small muted">Signed in as {email}</p>}
      <div className="row wrap">
        <a className="btn" href="/api/export" download>Export diary (CSV)</a>
        <button className="btn" onClick={async () => { await supabase().auth.signOut(); window.location.href = '/login'; }}>Sign out</button>
      </div>
      <details>
        <summary className="err" style={{ cursor: 'pointer' }}>Delete my data</summary>
        <div className="stack" style={{ marginTop: 8 }}>
          <p className="small">This permanently deletes your diary, foods, meals and targets. Export first if you want a copy.</p>
          <label className="row small"><input type="checkbox" checked={account} onChange={(e) => setAccount(e.target.checked)} /> Also delete my login</label>
          <label className="field">Type DELETE to confirm<input type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
          <button className="btn danger" disabled={confirm !== 'DELETE'} onClick={async () => {
            const res = await fetch('/api/account/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm, account }) });
            const j = await res.json();
            if (!res.ok) return setMsg(j.error);
            if (j.account) { window.location.href = '/login'; return; }
            setMsg(j.note ?? 'Your data has been deleted.');
            setTimeout(() => window.location.reload(), 1200);
          }}>Delete permanently</button>
          {msg && <p className="small" role="status">{msg}</p>}
        </div>
      </details>
    </section>
  );
}
