'use client';
// "About you": age, sex, height, weight, activity → personal reference targets for vitamins,
// minerals, protein, fiber, fluids and limits, plus an energy check of the calorie target.
import { useMemo, useState } from 'react';
import { useApp } from './AppData';
import * as data from '@/lib/data';
import { targetsFor } from '@/lib/day';
import { ACTIVITY, ageFrom, recommendTargets, type Activity, type Sex } from '@/lib/dri';
import { fmt, label, unitOf, type MetricKey } from '@/lib/nutrients';
import type { TargetSpec } from '@/lib/types';

const GROUPS: { title: string; icon: string; keys: MetricKey[] }[] = [
  { title: 'Macros & fluids', icon: '🥗', keys: ['protein_g', 'fiber_g', 'fluid_ml'] },
  { title: 'Vitamins', icon: '🍊', keys: ['vitamin_a_ug', 'vitamin_c_mg', 'vitamin_d_ug', 'vitamin_e_mg', 'vitamin_k_ug', 'vitamin_b6_mg', 'vitamin_b12_ug', 'folate_ug'] },
  { title: 'Minerals', icon: '🪨', keys: ['calcium_mg', 'iron_mg', 'magnesium_mg', 'potassium_mg', 'zinc_mg'] },
  { title: 'Limits', icon: '🚦', keys: ['sugar_g', 'sat_fat_g', 'sodium_mg', 'caffeine_mg'] },
];
const DASH_EXTRA: MetricKey[] = ['vitamin_d_ug', 'vitamin_c_mg', 'iron_mg', 'calcium_mg'];

export function AboutYouCard({ onApplied }: { onApplied?: () => void }) {
  const app = useApp();
  const p = app.profile!;
  const current = targetsFor(app.targets, app.today);
  const [year, setYear] = useState(p.birth_year ? String(p.birth_year) : '');
  const [sex, setSex] = useState<Sex | null>(p.sex);
  const [height, setHeight] = useState(p.height_cm ? String(p.height_cm) : '');
  const [weight, setWeight] = useState(p.weight_kg ? String(p.weight_kg) : '');
  const [activity, setActivity] = useState<Activity | null>(p.activity);
  const [kcal, setKcal] = useState(String(current?.calories ?? ''));
  const [addToDash, setAddToDash] = useState(true);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [busy, setBusy] = useState(false);

  const num = (s: string) => (s.trim() && Number(s) > 0 ? Number(s) : null);
  const body = { age: ageFrom(num(year)), sex, heightCm: num(height), weightKg: num(weight), activity };
  const calories = num(kcal);
  const rec = useMemo(() => recommendTargets(body, calories), [body.age, sex, body.heightCm, body.weightKg, activity, calories]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveAbout() {
    await data.saveProfile({ birth_year: num(year), sex, height_cm: num(height), weight_kg: num(weight), activity });
  }

  async function apply() {
    if (!calories) return setMsg({ err: 'Enter your daily calorie goal first.' });
    setBusy(true);
    setMsg({});
    try {
      await saveAbout();
      // Keep any targets you set yourself for nutrients the recommendation does not cover.
      const merged: Partial<Record<MetricKey, TargetSpec>> = { ...(current?.nutrients ?? {}), ...rec.nutrients };
      await data.saveTargets({ effective_date: app.today, calories, nutrients: merged, fluid_ml: rec.fluidMl, fluid_mode: current?.fluid_mode ?? 'all_drinks' });
      if (addToDash) {
        const dash = [...new Set([...(p.dashboard_nutrients ?? []), ...DASH_EXTRA])];
        await data.saveProfile({ dashboard_nutrients: dash });
      }
      await app.reload(['profile', 'targets']);
      onApplied?.();
      setMsg({ ok: `Saved as your targets from today (${app.today}). Earlier days keep their old targets.` });
    } catch (e) { setMsg({ err: (e as Error).message }); }
    setBusy(false);
  }

  const val = (k: MetricKey) => (k === 'fluid_ml' ? { min: rec.fluidMl } : rec.nutrients[k]);
  const curVal = (k: MetricKey) => (k === 'fluid_ml' ? current?.fluid_ml ?? undefined : current?.nutrients[k]?.min ?? current?.nutrients[k]?.max ?? undefined);

  return (
    <section className="card stack about" aria-label="About you" id="about">
      <div className="spread">
        <h2><span className="h-icon" aria-hidden="true">🧬</span> About you</h2>
        <span className="tiny muted">for personal targets</span>
      </div>
      <p className="muted small">Your daily vitamins, minerals, protein, fiber and fluids depend on age, sex and body size. Fill these in to get your own reference targets.</p>
      <div className="grid2">
        <label className="field">Birth year<input type="number" inputMode="numeric" min="1900" max={new Date().getFullYear()} value={year} onChange={(e) => setYear(e.target.value)} aria-label="Birth year" /></label>
        <div className="field"><span>Sex <span className="muted tiny">(sets reference values)</span></span>
          <div className="seg" role="group" aria-label="Sex">
            <button type="button" aria-pressed={sex === 'female'} onClick={() => setSex('female')}>Female</button>
            <button type="button" aria-pressed={sex === 'male'} onClick={() => setSex('male')}>Male</button>
          </div>
        </div>
        <label className="field">Height (cm)<input type="number" inputMode="decimal" min="50" max="260" value={height} onChange={(e) => setHeight(e.target.value)} aria-label="Height in cm" /></label>
        <label className="field">Weight (kg)<input type="number" inputMode="decimal" step="0.1" min="20" max="400" value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="Weight in kg" /></label>
        <label className="field">Activity
          <select value={activity ?? ''} onChange={(e) => setActivity((e.target.value || null) as Activity | null)} aria-label="Activity">
            <option value="">Choose…</option>
            {ACTIVITY.map((a) => <option key={a.key} value={a.key}>{a.label} ({a.hint})</option>)}
          </select>
        </label>
        <label className="field">Daily calorie goal (kcal)<input type="number" inputMode="numeric" min="800" max="6000" value={kcal} onChange={(e) => setKcal(e.target.value)} aria-label="Daily calorie goal" /></label>
      </div>

      {rec.energy && (
        <div className="energy" data-testid="energy">
          <div><span className="k">Resting</span><b className="num">{fmt(rec.energy.bmr)}</b><span className="u">kcal</span></div>
          <div><span className="k">Maintenance</span><b className="num">{fmt(rec.energy.maintenance)}</b><span className="u">kcal</span></div>
          <div><span className="k">Your goal</span><b className="num">{calories ? fmt(calories) : '—'}</b><span className="u">kcal</span></div>
          {calories ? (
            <p className="small energy-note">
              {Math.abs(rec.energy.deltaPerDay) < 100 ? 'About maintenance: weight should stay roughly the same.'
                : rec.energy.deltaPerDay < 0
                  ? <>About <b>{fmt(-rec.energy.deltaPerDay)} kcal below</b> maintenance, roughly <b>{fmt(-rec.energy.kgPerWeek)} kg a week</b> of loss.</>
                  : <>About <b>{fmt(rec.energy.deltaPerDay)} kcal above</b> maintenance, roughly <b>{fmt(rec.energy.kgPerWeek)} kg a week</b> of gain.</>}
            </p>
          ) : null}
        </div>
      )}
      {rec.warnings.map((w) => <p key={w} className="warnbox small" role="alert">⚠️ {w}</p>)}
      {rec.missing.length > 0 && <p className="tiny muted">Add your {rec.missing.join(', ')} for values that fit you exactly{rec.missing.includes('sex') ? '; without sex, the higher of the female and male values is used' : ''}.</p>}

      <div className="recgroups" data-testid="recommended">
        {GROUPS.map((g) => (
          <div key={g.title} className="recgroup">
            <div className="eyebrow">{g.icon} {g.title}</div>
            {g.keys.map((k) => {
              const v = val(k);
              if (!v) return null;
              const n = v.min ?? v.max!;
              const cur = curVal(k);
              const basis = rec.basis[k];
              return (
                <div className="recrow" key={k} title={basis}>
                  <span>{label(k)}</span>
                  <span className="num">
                    <b>{v.max !== undefined ? '≤ ' : ''}{fmt(n, k)} {unitOf(k)}</b>
                    {cur !== undefined && Math.abs(cur - n) > 0.001 && <span className="muted tiny"> now {fmt(cur, k)}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <details className="small">
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Where these numbers come from</summary>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }} className="muted">
          {Object.entries(rec.basis).filter(([k]) => ['protein_g', 'fiber_g', 'fluid_ml', 'iron_mg', 'sugar_g', 'sodium_mg', 'caffeine_mg'].includes(k)).map(([k, b]) => (
            <li key={k}><b>{label(k as MetricKey)}:</b> {b}</li>
          ))}
          <li>Vitamins and minerals: US National Academies Dietary Reference Intakes (RDA, or Adequate Intake where there is no RDA) for your age and sex. Energy: Mifflin–St Jeor equation.</li>
          {rec.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </details>
      <label className="row small"><input type="checkbox" checked={addToDash} onChange={(e) => setAddToDash(e.target.checked)} /> Also show vitamin D, vitamin C, iron and calcium on Today</label>
      {msg.err && <p className="err" role="alert">{msg.err}</p>}
      {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
      <div className="row wrap">
        <button className="btn primary grow" disabled={busy} onClick={apply}>{busy ? 'Saving…' : 'Use these as my daily targets'}</button>
        <button className="btn" disabled={busy} onClick={async () => { await saveAbout(); await app.reload(['profile']); setMsg({ ok: 'Saved.' }); }}>Just save my details</button>
      </div>
    </section>
  );
}
