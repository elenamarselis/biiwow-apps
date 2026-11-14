'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from './AppData';
import { AddSheet } from './AddSheet';
import { Sheet } from './Sheet';
import { Suggestions } from './Suggestions';
import * as data from '@/lib/data';
import { addDays, isValidDate, localHour, prettyDate } from '@/lib/dates';
import { calorieStatus, contributors, drinkSummary, summarize, targetFor, targetsFor, type DaySummary, type MetricTotal } from '@/lib/day';
import { describeAmount, fmtAmt, logDifferentAmount, markConsumed, markPlannedAgain, markSkipped } from '@/lib/entries';
import { fmt, label, lowerLabel, unitOf, type MetricKey } from '@/lib/nutrients';
import { recommend } from '@/lib/recommend';
import { MEALS, type Entry, type Meal, type Targets } from '@/lib/types';

export function Today() {
  const app = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const qd = params.get('d');
  const date = isValidDate(qd) ? qd : app.today;
  const [all, setAll] = useState<Entry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ meal: Meal | null; parent?: Entry | null } | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [detail, setDetail] = useState<MetricKey | null>(null);
  const [copying, setCopying] = useState<Meal | null>(null);
  const [savingMeal, setSavingMeal] = useState<Meal | null>(null);
  const [preview, setPreview] = useState<Entry[] | null>(null);

  // One query: this day, the six days before (patterns) and tomorrow (suggestions for tomorrow).
  const load = useCallback(async () => {
    try {
      setAll(await data.loadEntries(addDays(date, -7), addDays(date, 1)));
      setErr(null);
    } catch (e) { setErr((e as Error).message); }
  }, [date]);
  useEffect(() => { setAll(null); load(); }, [load]);

  const entries = useMemo(() => (all ?? []).filter((e) => e.entry_date === date), [all, date]);
  const targets = targetsFor(app.targets, date);
  const shown = preview ?? entries;
  const s = useMemo(() => summarize(shown, targets), [shown, targets]);
  const base = useMemo(() => summarize(entries, targets), [entries, targets]);

  const rec = useMemo(() => {
    if (!all || !app.profile) return null;
    const history = [];
    for (let i = 7; i >= -1; i--) {
      if (i === 0) continue;
      const d = addDays(date, -i);
      history.push({ date: d, entries: all.filter((e) => e.entry_date === d), targets: targetsFor(app.targets, d) });
    }
    return recommend({
      date, hour: date === app.today ? localHour() : date < app.today ? 23 : 6, entries, targets, candidates: app.candidates,
      prefs: { allergies: app.profile.allergies, avoid: app.profile.avoid_ingredients, diet: app.profile.diet, liked: app.profile.liked_foods },
      history,
      tracked: app.profile.dashboard_nutrients,
    });
  }, [all, app.profile, app.candidates, app.targets, app.today, date, entries, targets]);

  const go = (d: string) => router.replace(d === app.today ? '/today' : `/today?d=${d}`);

  async function act(fn: () => Promise<unknown>, msg?: string) {
    try { await fn(); if (msg) app.toast(msg); await load(); app.reload(['recent']); }
    catch (e) { app.toast((e as Error).message); }
  }

  if (!app.ready) return <div className="card"><div className="skeleton" /></div>;
  if (app.error) return <div className="card err">{app.error}</div>;

  const dash = (app.profile?.dashboard_nutrients ?? ['protein_g', 'fiber_g', 'fluid_ml']) as MetricKey[];

  return (
    <>
      <div className="datenav">
        <button className="iconbtn" onClick={() => go(addDays(date, -1))} aria-label="Previous day">‹</button>
        <div style={{ textAlign: 'center' }}>
          <h1>{prettyDate(date, app.today)}</h1>
          {date !== app.today && <button className="btn sm ghost" onClick={() => go(app.today)}>Back to today</button>}
        </div>
        <button className="iconbtn" onClick={() => go(addDays(date, 1))} aria-label="Next day">›</button>
      </div>

      {err && <div className="card err">{err}</div>}
      {!targets && (
        <div className="card">
          <h2>Set your daily calorie target</h2>
          <p className="muted small">Targets drive the summary and suggestions. You can add protein, fiber, fluids and vitamins too.</p>
          <a className="btn primary" href="/settings#targets" style={{ marginTop: 10 }}>Set targets</a>
        </div>
      )}

      <CalorieCard s={s} targets={targets} previewing={!!preview} onDetail={() => setDetail('energy_kcal')} />

      {all && rec && (
        <Suggestions date={date} entries={entries} result={rec} onPreview={setPreview}
          onApplied={async () => { setPreview(null); await load(); }} />
      )}

      {targets && dash.length > 0 && (
        <section className="card" aria-label="Nutrients">
          <div className="spread"><h2>Nutrients</h2><span className="legend"><span><i style={{ background: 'var(--accent)' }} />had</span><span><i style={{ background: 'var(--plan)' }} />planned</span></span></div>
          <div className="nbars" style={{ marginTop: 10 }}>
            {dash.map((k) => <NutrientBar key={k} k={k} s={s} targets={targets} onClick={() => setDetail(k)} />)}
          </div>
        </section>
      )}

      <DrinksCard entries={shown} targets={targets} onDetail={() => setDetail('fluid_ml')} />

      {!all ? <div className="card"><div className="skeleton" /></div> : MEALS.map((m) => (
        <MealSection key={m.key} meal={m.key} label={m.label} entries={entries.filter((e) => e.meal === m.key)}
          onAdd={() => setAdding({ meal: m.key })}
          onHad={(e) => act(() => data.setStatusWithExtras(e, entries, markConsumed(e)), `Logged ${e.name}`)}
          onOpen={setEditing}
          onCopy={() => setCopying(m.key)}
          onSave={() => setSavingMeal(m.key)}
        />
      ))}

      <button className="btn primary fab" onClick={() => setAdding({ meal: null })}>＋ Add food or drink</button>

      {adding && (
        <AddSheet date={date} meal={adding.meal} parent={adding.parent} onClose={() => setAdding(null)} onAdded={() => load()} />
      )}
      {editing && (
        <EntrySheet e={editing} all={entries} onClose={() => setEditing(null)}
          onAddExtra={() => { setAdding({ meal: editing.meal, parent: editing }); setEditing(null); }}
          act={async (fn, msg) => { await act(fn, msg); setEditing(null); }} />
      )}
      {detail && <NutrientDetail k={detail} entries={entries} targets={targets} s={base} onClose={() => setDetail(null)} />}
      {copying && <CopyMealSheet meal={copying} date={date} onClose={() => setCopying(null)} onDone={(n) => { setCopying(null); app.toast(`Copied ${n} item${n === 1 ? '' : 's'}`); load(); }} />}
      {savingMeal && <SaveMealSheet meal={savingMeal} entries={entries.filter((e) => e.meal === savingMeal && e.status !== 'skipped')} onClose={() => setSavingMeal(null)} />}
    </>
  );
}

// ---------------------------------------------------------------- calorie summary

function CalorieCard({ s, targets, previewing, onDetail }: { s: DaySummary; targets: Targets | null; previewing: boolean; onDetail: () => void }) {
  const target = targets?.calories ?? 0;
  const st = calorieStatus(s, target || 1);
  const scaleMax = Math.max(target, st.projected) || 1;
  const inc = st.incomplete;
  return (
    <section className="card kcal-hero" aria-label="Calories" style={previewing ? { outline: '2px dashed var(--accent)' } : undefined}>
      {previewing && <span className="chip planned" style={{ justifySelf: 'start' }}>Preview: not saved</span>}
      {targets ? (
        <div>
          <div className="eyebrow">Calories · target {fmt(target)} kcal</div>
          {st.over > 0
            ? <p className="headline over" data-testid="kcal-headline">Projected {fmt(st.over)} kcal over</p>
            : <p className="headline" data-testid="kcal-headline">{fmt(st.roomAfterPlan)} kcal left after your plan</p>}
        </div>
      ) : <div className="eyebrow">Calories</div>}
      <div className="three num" role="group" aria-label="Calorie totals">
        <div><div className="l">Consumed</div><div className="v" data-testid="kcal-consumed">{fmt(st.consumed)}</div></div>
        <div><div className="l">Still planned</div><div className="v" data-testid="kcal-planned">{fmt(st.planned)}</div></div>
        <div><div className="l">Projected</div><div className="v" data-testid="kcal-projected">{fmt(st.projected)}</div></div>
      </div>
      <div className={`bar${st.over > 0 ? ' over' : ''}`} aria-hidden="true">
        <div className="c" style={{ width: `${(st.consumed / scaleMax) * 100}%` }} />
        <div className="p" style={{ left: `${(st.consumed / scaleMax) * 100}%`, width: `${(st.planned / scaleMax) * 100}%` }} />
        {target > 0 && <div className="t" style={{ left: `calc(${(target / scaleMax) * 100}% - 1px)` }} />}
      </div>
      <div className="spread">
        {inc ? <button className="chip warn" onClick={onDetail}>Incomplete: {s.projected.energy_kcal.unknown.length} item(s) without calories</button> : <span />}
        <button className="btn sm ghost" onClick={onDetail}>Details</button>
      </div>
    </section>
  );
}

export function IncompleteChip({ t, testid }: { t: MetricTotal; testid?: string }) {
  if (!t.unknown.length) return null;
  return <span className="chip warn" data-testid={testid} title={`Unknown for: ${t.unknown.map((u) => u.name).join(', ')}`}>incomplete</span>;
}

function NutrientBar({ k, s, targets, onClick }: { k: MetricKey; s: DaySummary; targets: Targets | null; onClick: () => void }) {
  const t = targetFor(targets, k);
  const c = s.consumed[k].value;
  const p = s.planned[k].value;
  const proj = s.projected[k].value;
  const goal = t.min ?? t.max;
  const max = Math.max(goal ?? 0, proj) || 1;
  const over = t.max !== undefined && proj > t.max;
  const u = unitOf(k);
  return (
    <button className="nbar" onClick={onClick} data-testid={`nbar-${k}`} aria-label={`${label(k)} details`}>
      <span className="spread small">
        <span style={{ fontWeight: 800 }}>{label(k)} <IncompleteChip t={s.projected[k]} testid={`incomplete-${k}`} /></span>
        <span className="num">
          <b>{fmt(c, k)}</b> had · <b>{fmt(proj, k)}</b> projected
          {goal !== undefined ? <> / {t.min !== undefined ? '' : '≤ '}{fmt(goal, k)} {u}</> : <> {u}</>}
        </span>
      </span>
      <span className={`bar${k === 'fluid_ml' ? ' drink' : ''}${over ? ' over' : ''}`} aria-hidden="true">
        <span className="c" style={{ width: `${(c / max) * 100}%` }} />
        <span className="p" style={{ left: `${(c / max) * 100}%`, width: `${(p / max) * 100}%` }} />
        {goal !== undefined && <span className="t" style={{ left: `calc(${(goal / max) * 100}% - 1px)` }} />}
      </span>
    </button>
  );
}

function DrinksCard({ entries, targets, onDetail }: { entries: Entry[]; targets: Targets | null; onDetail: () => void }) {
  const d = drinkSummary(entries);
  const c = drinkSummary(entries, ['consumed']);
  if (!d.count) return null;
  const fluidT = targetFor(targets, 'fluid_ml').min;
  const cell = (l: string, t: MetricTotal, k: MetricKey, had?: MetricTotal) => (
    <div><div className="l">{l}</div><div className="v num">{fmt(t.value, k)} {unitOf(k)}{t.unknown.length ? '*' : ''}</div>
      {had && <div className="tiny muted num">{fmt(had.value, k)} had</div>}</div>
  );
  return (
    <section className="card" aria-label="Drinks">
      <div className="spread"><h2>Drinks</h2><button className="btn sm ghost" onClick={onDetail}>Details</button></div>
      <p className="muted small" style={{ marginBottom: 8 }}>
        {d.count} drink{d.count === 1 ? '' : 's'} logged or planned{fluidT ? ` · fluid target ${fmt(fluidT)} ml${targets?.fluid_mode === 'water_only' ? ' (water only)' : ''}` : ''}. Also counted once in your daily totals.
      </p>
      <div className="drinkgrid">
        {cell('Volume', d.volume, 'fluid_ml', c.volume)}
        {cell('Water', d.water, 'water_g')}
        {cell('Calories', d.energy, 'energy_kcal', c.energy)}
        {cell('Sugar', d.sugar, 'sugar_g')}
        {cell('Caffeine', d.caffeine, 'caffeine_mg')}
        {cell('Alcohol', d.alcohol, 'alcohol_g')}
      </div>
      {[d.volume, d.water, d.sugar, d.caffeine, d.alcohol].some((t) => t.unknown.length) && <p className="tiny muted" style={{ marginTop: 6 }}>* incomplete: some drinks have no value for this.</p>}
    </section>
  );
}

// ---------------------------------------------------------------- meals

function MealSection({ meal, label: title, entries, onAdd, onHad, onOpen, onCopy, onSave }: {
  meal: Meal; label: string; entries: Entry[]; onAdd: () => void; onHad: (e: Entry) => void; onOpen: (e: Entry) => void; onCopy: () => void; onSave: () => void;
}) {
  const s = summarize(entries);
  const parents = entries.filter((e) => !e.parent_id);
  return (
    <section className="card meal" aria-label={title} data-testid={`meal-${meal}`}>
      <div className="meal-head">
        <h2>{title}</h2>
        <span className="small muted num">{fmt(s.consumed.energy_kcal.value)} had · {fmt(s.planned.energy_kcal.value)} planned kcal</span>
      </div>
      {parents.length === 0 && <p className="muted small">Nothing yet.</p>}
      <div>
        {parents.map((e) => (
          <div key={e.id}>
            <EntryRow e={e} onHad={onHad} onOpen={onOpen} />
            {entries.filter((x) => x.parent_id === e.id).map((x) => <EntryRow key={x.id} e={x} extra onHad={onHad} onOpen={onOpen} />)}
          </div>
        ))}
      </div>
      <div className="row wrap">
        <button className="btn sm" onClick={onAdd}>＋ Add</button>
        <button className="btn sm ghost" onClick={onCopy}>Copy from another day</button>
        {parents.length > 0 && <button className="btn sm ghost" onClick={onSave}>Save as meal</button>}
      </div>
    </section>
  );
}

function EntryRow({ e, extra, onHad, onOpen }: { e: Entry; extra?: boolean; onHad: (e: Entry) => void; onOpen: (e: Entry) => void }) {
  const kcal = e.nutrients.energy_kcal !== undefined ? e.nutrients.energy_kcal * (e.basis === 'serving' ? e.amount : e.amount / 100) : null;
  const changed = e.status === 'consumed' && e.planned_amount !== null && Math.abs(e.planned_amount - e.amount) > 0.001;
  return (
    <div className={`entry ${e.status}${extra ? ' extra' : ''}`} data-testid="entry" data-name={e.name} data-status={e.status}>
      <button style={{ all: 'unset', cursor: 'pointer', minWidth: 0 }} onClick={() => onOpen(e)} aria-label={`Edit ${e.name}`}>
        <div className="name">{extra ? '+ ' : ''}{e.name}{e.brand ? <span className="muted small"> · {e.brand}</span> : null}</div>
        <div className="meta">
          <span>{describeAmount(e)}</span>
          <span className="num">{kcal === null ? 'kcal unknown' : `${fmt(kcal)} kcal`}</span>
          {e.state && <span className="chip">{e.state}</span>}
          {changed && <span className="chip warn">planned {fmtAmt(e.planned_amount!, e.unit)}</span>}
          {e.swapped_from && <span className="chip">swapped from {e.swapped_from}</span>}
          {e.note && <span className="tiny">{e.note}</span>}
        </div>
      </button>
      <div className="actions">
        {e.status === 'planned'
          ? <button className="btn sm primary" onClick={() => onHad(e)} aria-label={`Mark ${e.name} as had`}>✓ {e.kind === 'drink' ? 'Drank' : 'Ate'}</button>
          : <span className={`chip ${e.status}`}>{e.status === 'consumed' ? 'had' : 'skipped'}</span>}
        <button className="iconbtn sm" onClick={() => onOpen(e)} aria-label={`More for ${e.name}`}>⋯</button>
      </div>
    </div>
  );
}

function EntrySheet({ e, all, onClose, act, onAddExtra }: {
  e: Entry; all: Entry[]; onClose: () => void; onAddExtra: () => void;
  act: (fn: () => Promise<unknown>, msg?: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'menu' | 'different' | 'edit'>('menu');
  const [amt, setAmt] = useState(String(e.amount));
  const [rest, setRest] = useState<'keep' | 'skip'>('keep');
  const [meal, setMeal] = useState<Meal>(e.meal);
  const actual = Number(amt);
  const less = actual > 0 && actual < e.amount;
  const unit = e.unit === 'serving' ? 'servings' : e.unit;

  return (
    <Sheet title={e.name} onClose={onClose}>
      <p className="muted small">{describeAmount(e)} · {e.status === 'planned' ? 'planned' : e.status === 'consumed' ? 'had' : 'skipped'}{e.source_ref ? ` · ${e.source_ref}` : ''}</p>
      {mode === 'menu' && (
        <div className="stack tight">
          {e.status === 'planned' && <>
            <button className="btn primary" onClick={() => act(() => data.setStatusWithExtras(e, all, markConsumed(e)), `Logged ${e.name}`)}>✓ Had it as planned</button>
            <button className="btn" onClick={() => setMode('different')}>Had a different amount…</button>
            <button className="btn" onClick={() => act(() => data.setStatusWithExtras(e, all, markSkipped()), 'Skipped')}>Skip it</button>
          </>}
          {e.status !== 'planned' && <button className="btn" onClick={() => act(() => data.updateEntry(e.id, markPlannedAgain(e)), 'Back in plan')}>Move back to planned</button>}
          {e.kind === 'drink' && !e.parent_id && <button className="btn" onClick={onAddExtra}>＋ Add milk, syrup or another extra</button>}
          <button className="btn" onClick={() => setMode('edit')}>Edit amount or meal</button>
          <button className="btn danger" onClick={() => act(() => data.deleteEntry(e.id), 'Removed')}>Remove</button>
        </div>
      )}
      {mode === 'different' && (
        <div className="stack">
          <label className="field">How much did you have? ({unit}) <span className="muted tiny">planned {fmtAmt(e.amount, e.unit)}</span>
            <input type="number" inputMode="decimal" step="any" min="0" autoFocus value={amt} onChange={(ev) => setAmt(ev.target.value)} aria-label="Actual amount" />
          </label>
          {less && (
            <div className="seg" role="group" aria-label="The rest">
              <button aria-pressed={rest === 'keep'} onClick={() => setRest('keep')}>Keep the rest planned ({fmtAmt(e.amount - actual, e.unit)})</button>
              <button aria-pressed={rest === 'skip'} onClick={() => setRest('skip')}>Skip the rest</button>
            </div>
          )}
          <button className="btn primary" disabled={!(actual > 0)} onClick={() => act(async () => {
            const { patch, remainder } = logDifferentAmount(e, actual, rest);
            await data.updateEntry(e.id, patch);
            if (remainder) await data.insertEntries([remainder]);
          }, `Logged ${fmtAmt(actual, e.unit)} of ${e.name}`)}>Log {actual > 0 ? fmtAmt(actual, e.unit) : ''}</button>
        </div>
      )}
      {mode === 'edit' && (
        <div className="stack">
          <label className="field">Amount ({unit})<input type="number" inputMode="decimal" step="any" min="0" value={amt} onChange={(ev) => setAmt(ev.target.value)} /></label>
          <label className="field">Meal
            <select value={meal} onChange={(ev) => setMeal(ev.target.value as Meal)}>{MEALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
          </label>
          <button className="btn primary" disabled={!(actual > 0)} onClick={() => act(() => data.updateEntry(e.id, {
            amount: actual, meal,
            portion_count: e.portion_count && e.amount ? Math.round((e.portion_count * actual / e.amount) * 100) / 100 : e.portion_count,
            ...(e.status === 'planned' ? { planned_amount: actual } : {}),
          }), 'Saved')}>Save</button>
        </div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- detail, copy, save

function NutrientDetail({ k, entries, targets, s, onClose }: { k: MetricKey; entries: Entry[]; targets: Targets | null; s: DaySummary; onClose: () => void }) {
  const [which, setWhich] = useState<'projected' | 'consumed'>('projected');
  const waterOnly = targets?.fluid_mode === 'water_only';
  const rows = contributors(entries, k, which === 'projected' ? ['consumed', 'planned'] : ['consumed'], waterOnly);
  const t = targetFor(targets, k);
  const total = s[which][k];
  return (
    <Sheet title={label(k)} onClose={onClose}>
      <div className="seg" role="group">
        <button aria-pressed={which === 'projected'} onClick={() => setWhich('projected')}>Projected</button>
        <button aria-pressed={which === 'consumed'} onClick={() => setWhich('consumed')}>Consumed</button>
      </div>
      <p className="num"><b>{fmt(total.value, k)} {unitOf(k)}</b>
        {t.min !== undefined && <> of {fmt(t.min, k)} {unitOf(k)} target</>}{t.max !== undefined && <> · limit {fmt(t.max, k)} {unitOf(k)}</>}
        {' '}<IncompleteChip t={total} />
      </p>
      {total.unknown.length > 0 && (
        <p className="small muted">Incomplete: {total.unknown.map((u) => u.name).join(', ')} {total.unknown.length === 1 ? 'has' : 'have'} no {lowerLabel(k)} value, so the real total is likely higher.</p>
      )}
      <table className="t">
        <thead><tr><th>Food or drink</th><th className="n">{unitOf(k)}</th><th className="n">Share</th></tr></thead>
        <tbody>
          {rows.rows.map(({ entry, value, share }) => (
            <tr key={entry.id}>
              <td>{entry.name} <span className="muted tiny">{entry.status === 'planned' ? 'planned' : ''}</span></td>
              <td className="n">{value === null ? <i className="muted">unknown</i> : fmt(value, k)}</td>
              <td className="n">{value === null ? '' : `${Math.round(share * 100)}%`}</td>
            </tr>
          ))}
          {!rows.rows.length && <tr><td colSpan={3} className="muted">Nothing logged.</td></tr>}
        </tbody>
      </table>
    </Sheet>
  );
}

function CopyMealSheet({ meal, date, onClose, onDone }: { meal: Meal; date: string; onClose: () => void; onDone: (n: number) => void }) {
  const [from, setFrom] = useState(addDays(date, -1));
  const [items, setItems] = useState<Entry[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { data.loadEntries(from, from).then((e) => setItems(e.filter((x) => x.meal === meal && x.status !== 'skipped'))).catch(() => setItems([])); }, [from, meal]);
  return (
    <Sheet title={`Copy ${MEALS.find((m) => m.key === meal)!.label.toLowerCase()} from`} onClose={onClose}>
      <label className="field">Day<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={addDays(date, 30)} /></label>
      {!items ? <div className="skeleton" /> : items.length === 0 ? <p className="muted small">Nothing in that meal on that day.</p> : (
        <div className="list">{items.map((e) => <div className="li" key={e.id}><span>{e.name}</span><span className="muted small">{describeAmount(e)}</span></div>)}</div>
      )}
      <p className="muted tiny">Copied items are added as planned. Mark them when you have them.</p>
      <button className="btn primary" disabled={busy || !items?.length} onClick={async () => {
        setBusy(true);
        const n = await data.copyMeal(from, meal, date, 'planned');
        onDone(n);
      }}>Copy {items?.length ?? ''} item{items?.length === 1 ? '' : 's'}</button>
    </Sheet>
  );
}

function SaveMealSheet({ meal, entries, onClose }: { meal: Meal; entries: Entry[]; onClose: () => void }) {
  const app = useApp();
  const [name, setName] = useState(`My ${meal}`);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title="Save as a meal" onClose={onClose}>
      <p className="muted small">Saves these {entries.length} items as a reusable meal you can add in one step.</p>
      <label className="field">Name<input type="text" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <button className="btn primary" disabled={busy || !name.trim()} onClick={async () => {
        setBusy(true);
        await data.saveMeal({ name: name.trim(), kind: 'group', yield_amount: null, yield_unit: null, default_meal: meal, is_favorite: true, items: data.entriesToItems(entries) });
        await app.reload(['meals']);
        app.toast('Meal saved');
        onClose();
      }}>Save meal</button>
    </Sheet>
  );
}
