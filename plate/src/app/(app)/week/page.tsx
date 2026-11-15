'use client';
// Progress: calorie tracking over 7 or 30 days (daily intake against the goal in force that
// day, averages, days on target, and the weight change your intake implies against your
// estimated maintenance), plus recurring nutrient gaps and daily totals.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/components/AppData';
import * as data from '@/lib/data';
import { addDays, shortDay } from '@/lib/dates';
import { summarize, targetFor, targetsFor } from '@/lib/day';
import { ageFrom, recommendTargets } from '@/lib/dri';
import { fmt, label, lowerLabel, unitOf, type MetricKey } from '@/lib/nutrients';
import { MEALS, type Entry } from '@/lib/types';

export default function WeekPage() {
  const app = useApp();
  const [span, setSpan] = useState<7 | 30>(7);
  const [end, setEnd] = useState(app.today);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  useEffect(() => { setEnd(app.today); }, [app.today]);
  useEffect(() => {
    setEntries(null);
    data.loadEntries(addDays(end, -(span - 1)), end).then(setEntries).catch(() => setEntries([]));
  }, [end, span]);

  const plan = !!app.profile?.planning;
  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDays(end, i - (span - 1))), [end, span]);
  const rows = useMemo(() => days.map((d) => {
    const es = (entries ?? []).filter((e) => e.entry_date === d);
    const t = targetsFor(app.targets, d);
    const s = summarize(es, t);
    // With planning on, today and future days include the plan; otherwise only what was eaten.
    const shown = plan && d >= app.today ? s.projected : s.consumed;
    const byMeal = Object.fromEntries(MEALS.map((m) => [m.key, summarize(es.filter((e) => e.meal === m.key)).consumed.energy_kcal.value]));
    return { date: d, t, s, shown, byMeal, logged: es.some((e) => e.status === 'consumed'), planned: d >= app.today };
  }), [days, entries, app.targets, app.today, plan]);

  // ---- calorie stats. Today is still going, so only finished days are judged against the goal.
  const logged = rows.filter((r) => r.logged);
  const kcal = (r: (typeof rows)[number]) => r.shown.energy_kcal.value;
  const finished = logged.filter((r) => r.date < app.today);
  const todayRow = rows.find((r) => r.date === app.today);
  const avg = finished.length ? finished.reduce((a, r) => a + kcal(r), 0) / finished.length : 0;
  const withGoal = finished.filter((r) => r.t);
  const onTarget = withGoal.filter((r) => kcal(r) <= r.t!.calories * 1.05 && kcal(r) >= r.t!.calories * 0.8).length;
  const over = withGoal.filter((r) => kcal(r) > r.t!.calories * 1.05).length;
  const vsGoal = withGoal.reduce((a, r) => a + (kcal(r) - r.t!.calories), 0);
  const p = app.profile;
  const energy = p ? recommendTargets({ age: ageFrom(p.birth_year), sex: p.sex, heightCm: p.height_cm, weightKg: p.weight_kg, activity: p.activity }, null).energy : null;
  // Only completed days count towards the weight estimate (today is still going).
  const done = finished;
  const vsMaint = energy ? done.reduce((a, r) => a + (kcal(r) - energy.maintenance), 0) : 0;
  const kgChange = vsMaint / 7700;
  const mealAvg = MEALS.map((m) => ({ ...m, kcal: logged.length ? logged.reduce((a, r) => a + r.byMeal[m.key], 0) / logged.length : 0 }));
  const mealTotal = mealAvg.reduce((a, m) => a + m.kcal, 0) || 1;

  const metrics = useMemo(() => {
    const set = new Set<MetricKey>(app.profile?.dashboard_nutrients ?? []);
    for (const r of rows) for (const [k, v] of Object.entries(r.t?.nutrients ?? {})) if (v?.min || v?.max) set.add(k as MetricKey);
    if (rows.some((r) => r.t?.fluid_ml)) set.add('fluid_ml');
    return [...set];
  }, [rows, app.profile]);

  const gaps = useMemo(() => metrics.flatMap((k) => {
    const past = rows.filter((r) => r.logged && r.date < app.today);
    const low = past.filter((r) => { const min = targetFor(r.t, k).min; return min !== undefined && r.s.consumed[k].value < min * 0.8; });
    if (past.length < 3 || low.length < Math.max(3, Math.ceil(past.length * 0.6))) return [];
    const inc = low.filter((r) => r.s.consumed[k].unknown.length > 0).length;
    return [{ k, low: low.length, of: past.length, inc }];
  }), [metrics, rows, app.today]);

  const maxKcal = Math.max(1, ...rows.map((r) => Math.max(kcal(r), r.t?.calories ?? 0)));
  const MEAL_COLOR: Record<string, string> = { breakfast: '#f4b63f', lunch: '#2fb67c', dinner: '#e8704a', snacks: '#e45d93', drinks: '#3b82f6' };

  return (
    <>
      <div className="datenav">
        <button className="iconbtn" onClick={() => setEnd(addDays(end, -span))} aria-label="Earlier">‹</button>
        <div style={{ textAlign: 'center' }}>
          <h1>Calories &amp; progress</h1>
          <div className="seg" role="group" aria-label="Range" style={{ marginTop: 6 }}>
            <button aria-pressed={span === 7} onClick={() => setSpan(7)}>7 days</button>
            <button aria-pressed={span === 30} onClick={() => setSpan(30)}>30 days</button>
          </div>
        </div>
        <button className="iconbtn" onClick={() => setEnd(addDays(end, span))} aria-label="Later" disabled={end >= app.today}>›</button>
      </div>
      {!entries ? <div className="card"><div className="skeleton" /></div> : (
        <>
          <section className="card" aria-label="Calorie summary" data-testid="calorie-stats">
            <h2><span className="h-icon" aria-hidden="true">🔥</span> Calories</h2>
            <p className="muted small">{days[0]} to {days.at(-1)}{end === app.today ? ' (today included)' : ''} · {logged.length} day{logged.length === 1 ? '' : 's'} logged{todayRow?.logged && end === app.today ? ', including today (in progress)' : ''}</p>
            <div className="statgrid" style={{ marginTop: 10 }}>
              {todayRow && end === app.today && (
                <div className="today-stat">
                  <span className="k">Today so far</span>
                  <b className="num" data-testid="today-kcal">{fmt(kcal(todayRow))}</b>
                  <span className="u">{todayRow.t ? (kcal(todayRow) <= todayRow.t.calories ? `kcal · ${fmt(todayRow.t.calories - kcal(todayRow))} left of ${fmt(todayRow.t.calories)}` : `kcal · ${fmt(kcal(todayRow) - todayRow.t.calories)} over ${fmt(todayRow.t.calories)}`) : 'kcal'}</span>
                </div>
              )}
              <div><span className="k">Average a day</span>{finished.length ? <><b className="num" data-testid="avg-kcal">{fmt(avg)}</b><span className="u">kcal, finished days</span></> : <><b className="num">—</b><span className="u">no finished days yet</span></>}</div>
              <div><span className="k">On target</span>{withGoal.length ? <><b className="num">{onTarget}<span className="u"> / {withGoal.length}</span></b><span className="u">finished days{over ? ` · ${over} over` : ''}</span></> : <><b className="num">—</b><span className="u">from tomorrow</span></>}</div>
              <div><span className="k">vs your goals</span>{withGoal.length ? <><b className={`num ${vsGoal > 0 ? 'neg' : 'pos'}`}>{vsGoal > 0 ? '+' : '−'}{fmt(Math.abs(vsGoal))}</b><span className="u">kcal, finished days</span></> : <><b className="num">—</b><span className="u">no finished days yet</span></>}</div>
              <div>
                <span className="k">Est. weight change</span>
                {energy ? (done.length
                  ? <><b className={`num ${kgChange > 0 ? 'neg' : 'pos'}`}>{kgChange > 0 ? '+' : kgChange < 0 ? '−' : ''}{fmt(Math.abs(kgChange))}</b><span className="u">kg from {done.length} finished day{done.length === 1 ? '' : 's'}</span></>
                  : <><b className="num">—</b><span className="u">from tomorrow</span></>)
                  : <><b className="num">—</b><a className="u" href="/settings#about">add your details</a></>}
              </div>
            </div>

            <div className="kchart" style={{ marginTop: 16 }} role="img" aria-label="Daily calories against goal">
              {rows.map((r) => {
                const v = kcal(r);
                const t = r.t?.calories;
                const cls = r.date === app.today ? 'today' : !r.logged ? 'none' : t && v > t * 1.05 ? 'over' : t && v < t * 0.8 ? 'low' : 'ok';
                return (
                  <div className="kcol" key={r.date} title={`${r.date}: ${fmt(v)} kcal${t ? ` of ${fmt(t)}` : ''}`}>
                    {span === 7 && r.logged && <span className="kval num">{fmt(v)}</span>}
                    <div className={`kbar ${cls}`} style={{ height: `${(v / maxKcal) * 100}%` }} />
                    {t && <div className="kgoal" style={{ bottom: `${(t / maxKcal) * 100}%` }} />}
                  </div>
                );
              })}
            </div>
            <div className={`klabels${span === 30 ? ' dense' : ''}`}>
              {rows.map((r, i) => <span key={r.date}>{span === 7 ? shortDay(r.date) : (i % 5 === 0 || i === rows.length - 1 ? r.date.slice(8) : '')}</span>)}
            </div>
            <div className="legend" style={{ marginTop: 8 }}>
              <span><i className="lg-today" />today so far</span>
              <span><i style={{ background: 'var(--accent)' }} />on target</span>
              <span><i style={{ background: '#7fb6ea' }} />well under goal</span>
              <span><i style={{ background: 'var(--bad)' }} />over goal</span>
              <span><i style={{ background: 'var(--fg)', height: 2, verticalAlign: 3 }} />goal</span>
            </div>
            {energy && <p className="tiny muted" style={{ marginTop: 8 }}>Weight estimate: what you ate against your estimated maintenance of {fmt(energy.maintenance)} kcal a day (about 7,700 kcal per kg). Real changes vary with water, activity and how complete your logging is.</p>}
          </section>

          {logged.length > 0 && (
            <section className="card" aria-label="Where calories come from">
              <h2><span className="h-icon" aria-hidden="true">🍽️</span> Where your calories come from</h2>
              <div className="mealsplit" style={{ marginTop: 10 }}>
                {mealAvg.filter((m) => m.kcal > 0).map((m) => <span key={m.key} style={{ width: `${(m.kcal / mealTotal) * 100}%`, background: MEAL_COLOR[m.key] }} title={`${m.label}: ${fmt(m.kcal)} kcal`} />)}
              </div>
              <div className="mealsplit-legend">
                {mealAvg.map((m) => (
                  <span key={m.key}><i style={{ background: MEAL_COLOR[m.key] }} />{m.label} <b className="num">{fmt(m.kcal)}</b> <span className="muted">kcal · {Math.round((m.kcal / mealTotal) * 100)}%</span></span>
                ))}
              </div>
              <p className="tiny muted">Average per logged day.</p>
            </section>
          )}

          <section className="card" aria-label="Recurring gaps">
            <h2><span className="h-icon" aria-hidden="true">📉</span> Recurring gaps</h2>
            {gaps.length === 0
              ? <p className="small muted">No nutrient has been below 80% of its target on most logged days in this period.</p>
              : <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18 }}>{gaps.map((g) => (
                  <li key={g.k}><b>{label(g.k)}</b>: logged intake below 80% of target on {g.low} of {g.of} logged days.
                    {g.inc > 0 && <span className="muted"> {g.inc} of those days include foods with unknown {lowerLabel(g.k)} values, so actual intake may be higher.</span>}</li>
                ))}</ul>}
            {gaps.length > 0 && <p className="tiny muted" style={{ marginTop: 6 }}>&ldquo;Fill my gaps&rdquo; on Today suggests the lowest-calorie foods for these.</p>}
          </section>

          <section className="card" aria-label="Daily totals">
            <h2>Daily totals</h2>
            <div className="scrollx">
              <table className="t num" style={{ marginTop: 6, minWidth: 520 }}>
                <thead><tr><th>Day</th><th className="n">kcal</th>{metrics.map((k) => <th key={k} className="n">{label(k)}<br /><span className="tiny">{unitOf(k)}</span></th>)}</tr></thead>
                <tbody>{[...rows].reverse().filter((r) => r.logged || r.date === app.today).map((r) => (
                  <tr key={r.date}>
                    <td><a href={`/today?d=${r.date}`}>{shortDay(r.date)} {r.date.slice(8)}</a></td>
                    <td className="n">{fmt(kcal(r))}{r.t ? <span className="muted tiny">/{r.t.calories}</span> : null}</td>
                    {metrics.map((k) => {
                      const tt = targetFor(r.t, k);
                      const v = r.shown[k].value;
                      const low = tt.min !== undefined && v < tt.min * 0.8;
                      const overL = tt.max !== undefined && v > tt.max;
                      return (
                        <td key={k} className="n" style={{ color: low ? 'var(--warn)' : overL ? 'var(--bad)' : undefined }}>
                          {fmt(v, k)}{r.shown[k].unknown.length ? '*' : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <p className="tiny muted" style={{ marginTop: 6 }}>* incomplete: at least one item that day has no value for this nutrient. Amber: below 80% of target. Red: over a limit.</p>
          </section>
        </>
      )}
    </>
  );
}
