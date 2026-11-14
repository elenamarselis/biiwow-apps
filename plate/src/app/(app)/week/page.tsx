'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/components/AppData';
import * as data from '@/lib/data';
import { addDays, shortDay } from '@/lib/dates';
import { summarize, targetFor, targetsFor } from '@/lib/day';
import { fmt, label, lowerLabel, unitOf, type MetricKey } from '@/lib/nutrients';
import type { Entry } from '@/lib/types';

export default function WeekPage() {
  const app = useApp();
  const [end, setEnd] = useState(app.today);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  useEffect(() => { setEnd(app.today); }, [app.today]);
  useEffect(() => { setEntries(null); data.loadEntries(addDays(end, -6), end).then(setEntries).catch(() => setEntries([])); }, [end]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(end, i - 6)), [end]);
  const rows = useMemo(() => days.map((d) => {
    const es = (entries ?? []).filter((e) => e.entry_date === d);
    const t = targetsFor(app.targets, d);
    const s = summarize(es, t);
    // past days: what was consumed; today/future: projected (plan included)
    const shown = d < app.today ? s.consumed : s.projected;
    return { date: d, t, s, shown, logged: es.some((e) => e.status === 'consumed'), planned: d >= app.today };
  }), [days, entries, app.targets, app.today]);

  const metrics = useMemo(() => {
    const set = new Set<MetricKey>(app.profile?.dashboard_nutrients ?? []);
    for (const r of rows) for (const [k, v] of Object.entries(r.t?.nutrients ?? {})) if (v?.min || v?.max) set.add(k as MetricKey);
    if (rows.some((r) => r.t?.fluid_ml)) set.add('fluid_ml');
    return [...set];
  }, [rows, app.profile]);

  const gaps = useMemo(() => metrics.flatMap((k) => {
    const logged = rows.filter((r) => r.logged && r.date < app.today);
    const low = logged.filter((r) => { const min = targetFor(r.t, k).min; return min !== undefined && r.s.consumed[k].value < min * 0.8; });
    if (logged.length < 3 || low.length < Math.max(3, Math.ceil(logged.length * 0.6))) return [];
    const inc = low.filter((r) => r.s.consumed[k].unknown.length > 0).length;
    return [{ k, low: low.length, of: logged.length, inc }];
  }), [metrics, rows, app.today]);

  const maxKcal = Math.max(1, ...rows.map((r) => Math.max(r.shown.energy_kcal.value, r.t?.calories ?? 0)));

  return (
    <>
      <div className="datenav">
        <button className="iconbtn" onClick={() => setEnd(addDays(end, -7))} aria-label="Previous week">‹</button>
        <h1>7 days to {end === app.today ? 'today' : end}</h1>
        <button className="iconbtn" onClick={() => setEnd(addDays(end, 7))} aria-label="Next week" disabled={end >= app.today}>›</button>
      </div>
      {!entries ? <div className="card"><div className="skeleton" /></div> : (
        <>
          <section className="card" aria-label="Calories by day">
            <h2>Calories</h2>
            <p className="muted small">Past days show what you had; today shows consumed plus planned.</p>
            <div className="weekgrid" style={{ marginTop: 12 }}>
              {rows.map((r) => {
                const v = r.shown.energy_kcal.value;
                const t = r.t?.calories;
                const cls = t && v > t * 1.05 ? 'over' : t && v < t * 0.8 ? 'low' : '';
                return (
                  <div className="col" key={r.date} title={`${r.date}: ${fmt(v)} kcal${t ? ` of ${t}` : ''}`}>
                    <div className={`fill ${cls}`} style={{ height: `${(v / maxKcal) * 100}%` }} />
                    {t && <div className="tline" style={{ bottom: `${(t / maxKcal) * 100}%` }} />}
                  </div>
                );
              })}
            </div>
            <div className="weeklabels" style={{ marginTop: 4 }}>{rows.map((r) => <span key={r.date}>{shortDay(r.date)}</span>)}</div>
          </section>

          <section className="card" aria-label="Recurring gaps">
            <h2>Recurring gaps</h2>
            {gaps.length === 0
              ? <p className="small muted">No nutrient has been below 80% of its target on most logged days this week.</p>
              : <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18 }}>{gaps.map((g) => (
                  <li key={g.k}><b>{label(g.k)}</b>: logged intake below 80% of target on {g.low} of {g.of} logged days.
                    {g.inc > 0 && <span className="muted"> {g.inc} of those days include foods with unknown {lowerLabel(g.k)} values, so actual intake may be higher.</span>}</li>
                ))}</ul>}
            {gaps.length > 0 && <p className="tiny muted" style={{ marginTop: 6 }}>Today’s suggestions include foods to plan for upcoming meals.</p>}
          </section>

          <section className="card" aria-label="Daily totals">
            <h2>Daily totals</h2>
            <div className="scrollx">
              <table className="t num" style={{ marginTop: 6, minWidth: 520 }}>
                <thead><tr><th>Day</th><th className="n">kcal</th>{metrics.map((k) => <th key={k} className="n">{label(k)}<br /><span className="tiny">{unitOf(k)}</span></th>)}</tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.date}>
                    <td><a href={`/today?d=${r.date}`}>{shortDay(r.date)} {r.date.slice(8)}</a></td>
                    <td className="n">{fmt(r.shown.energy_kcal.value)}{r.t ? <span className="muted tiny">/{r.t.calories}</span> : null}</td>
                    {metrics.map((k) => {
                      const tt = targetFor(r.t, k);
                      const v = r.shown[k].value;
                      const low = tt.min !== undefined && v < tt.min * 0.8 && (r.logged || r.planned);
                      const over = tt.max !== undefined && v > tt.max;
                      return (
                        <td key={k} className="n" style={{ color: low ? 'var(--warn)' : over ? 'var(--bad)' : undefined }}>
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
