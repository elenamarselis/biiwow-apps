'use client';
import { useState } from 'react';
import { useApp } from './AppData';
import * as data from '@/lib/data';
import { fmt, label, unitOf, type MetricKey } from '@/lib/nutrients';
import { simulate, type Action, type RecommendResult, type Suggestion } from '@/lib/recommend';
import { prettyDate } from '@/lib/dates';
import { fmtAmt } from '@/lib/entries';
import type { Entry } from '@/lib/types';

const u = (k: MetricKey) => (unitOf(k) === 'kcal' ? ' kcal' : ` ${unitOf(k)}`);

export function Suggestions({ date, entries, result, onPreview, onApplied }: {
  date: string; entries: Entry[]; result: RecommendResult;
  onPreview: (e: Entry[] | null) => void; onApplied: () => Promise<void>;
}) {
  const app = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function apply(s: Suggestion) {
    setBusy(s.id);
    try {
      await data.applyActions(s.actions, entries);
      app.toast(s.appliesTo === date ? 'Plan updated' : `Added to ${prettyDate(s.appliesTo, app.today).toLowerCase()}'s plan`);
      setOpen(null);
      onPreview(null);
      await onApplied();
    } catch (e) {
      app.toast((e as Error).message);
    } finally { setBusy(null); }
  }

  function togglePreview(s: Suggestion) {
    if (open === s.id) { setOpen(null); onPreview(null); return; }
    setOpen(s.id);
    onPreview(s.appliesTo === date ? simulate(entries, s.actions) : null);
  }

  return (
    <section className="card" aria-label="Suggestions" data-testid="suggestions">
      <div className="spread"><h2>Suggestions</h2><span className="tiny muted">from your plan and logs</span></div>
      <div className="stack" style={{ marginTop: 8 }}>
        {result.suggestions.map((s) => (
          <article key={s.id} className="sugg" data-testid="suggestion" data-kind={s.kind}>
            <div className="title">{s.title}</div>
            <p className="small">{s.reason}</p>
            {s.note && <p className="tiny muted">{s.note}</p>}
            <div className="row">
              <button className="btn sm" aria-expanded={open === s.id} onClick={() => togglePreview(s)}>{open === s.id ? 'Hide preview' : 'Preview'}</button>
              <button className="btn sm primary" disabled={busy === s.id} onClick={() => apply(s)}>{busy === s.id ? 'Applying…' : 'Apply to plan'}</button>
            </div>
            {open === s.id && (
              <div className="preview" data-testid="suggestion-preview">
                <div className="eyebrow">Changes to {s.appliesTo === date ? 'this plan' : `${prettyDate(s.appliesTo, app.today).toLowerCase()}'s plan`}</div>
                {s.actions.map((a, i) => <ChangeLine key={i} a={a} entries={entries} />)}
                <div className="eyebrow">Projected end of day</div>
                <div className="impacts num">
                  {s.impacts.map((i) => {
                    const d = i.after - i.before;
                    const goal = i.min ?? i.max;
                    return (
                      <div className="imp" key={i.key}>
                        <span>{label(i.key)}{i.incomplete ? <span className="chip warn" style={{ marginLeft: 6 }}>incomplete</span> : null}</span>
                        <span>
                          {fmt(i.before, i.key)} → <b>{fmt(i.after, i.key)}</b>{u(i.key)}
                          {goal !== undefined && <span className="muted"> / {i.min !== undefined ? '' : '≤ '}{fmt(goal, i.key)}</span>}
                          {Math.abs(d) >= 0.5 && <span className={d > 0 ? 'up' : 'down'}> ({d > 0 ? '+' : '−'}{fmt(Math.abs(d), i.key)})</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {s.tradeoffs.length > 0 && (
                  <div className="small"><b>Trade-offs:</b> {s.tradeoffs.join('; ')}.</div>
                )}
                <p className="tiny muted">Logged (consumed) items are never changed.</p>
              </div>
            )}
          </article>
        ))}
        {result.message && <p className="small muted" data-testid="suggestion-message">{result.message}</p>}
        {result.notes.map((n) => <p key={n} className="small muted">{n}</p>)}
      </div>
    </section>
  );
}

function ChangeLine({ a, entries }: { a: Action; entries: Entry[] }) {
  const e = 'entryId' in a ? entries.find((x) => x.id === a.entryId) : null;
  if (a.type === 'add') return <p className="change">Add <b>{fmtAmt(a.amount, a.food.basis)} {a.food.name}</b> to {a.meal}</p>;
  if (!e) return null;
  if (a.type === 'replace') return <p className="change"><del>{fmtAmt(e.amount, e.unit)} {e.name}</del> → <b>{fmtAmt(a.amount, a.food.basis)} {a.food.name}</b></p>;
  if (a.type === 'resize') return <p className="change">{e.name}: <del>{fmtAmt(e.amount, e.unit)}</del> → <b>{fmtAmt(a.amount, e.unit)}</b></p>;
  return <p className="change">Skip <del>{e.name}</del></p>;
}
