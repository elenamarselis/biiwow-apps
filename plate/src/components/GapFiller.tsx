'use client';
// "Fill my gaps" card on Today:
//   1. Vitamin boosters: simple, low-calorie foods (under 100 kcal each) that cover the most of
//      today's vitamin and mineral gaps.
//   2. For what's still short (protein, fiber…): up to two more foods.
// Every food can be logged with one tap, or all at once.
import { useMemo, useState } from 'react';
import { useApp } from './AppData';
import * as data from '@/lib/data';
import { listNutrients, recommendForGaps, type BasketItem, type Gap } from '@/lib/basket';
import { entryFromFood } from '@/lib/entries';
import { fmt, label, unitOf, type NutrientKey } from '@/lib/nutrients';
import { upcomingMeal } from '@/lib/recommend';
import { localHour } from '@/lib/dates';
import type { Entry, Targets } from '@/lib/types';

export function GapFiller({ date, entries, targets, plan, onLogged }: {
  date: string; entries: Entry[]; targets: Targets | null; plan: boolean; onLogged: () => Promise<void>;
}) {
  const app = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const p = app.profile;
  const rec = useMemo(() => recommendForGaps({
    entries, targets, candidates: app.candidates,
    prefs: { allergies: p?.allergies ?? [], avoid: p?.avoid_ingredients ?? [], diet: p?.diet ?? [], liked: p?.liked_foods ?? [] },
  }), [entries, targets, app.candidates, p]);

  const minKeys = Object.entries(targets?.nutrients ?? {}).filter(([k, v]) => v?.min && k !== 'fluid_ml');
  if (!targets || minKeys.length === 0) return null;

  const { gaps, boosters, rest } = rec;
  const items = [...boosters.items, ...rest.items];
  const status = plan ? 'planned' : 'consumed';

  async function log(list: BasketItem[], key: string) {
    setBusy(key);
    try {
      const meal = upcomingMeal(date === app.today ? localHour() : 12);
      await data.insertEntries(list.map((it) => entryFromFood(
        { ...it.food, id: it.food.ref.type === 'food' ? it.food.ref.id : undefined, catalogId: it.food.ref.type === 'catalog' ? it.food.ref.id : null },
        { date, meal: it.food.kind === 'drink' ? 'drinks' : meal, amount: it.amount, status, portion: it.portion, portionCount: it.count },
      )));
      app.toast(list.length > 1 ? `Logged ${list.length} foods` : `Logged ${list[0].food.name}`);
      await onLogged();
      app.reload(['recent']);
    } catch (e) { app.toast((e as Error).message); }
    setBusy(null);
  }

  const row = (it: BasketItem, ref: Gap[]) => {
    const top = (Object.entries(it.adds) as [NutrientKey, number][])
      .map(([k, v]) => ({ k, share: v / (ref.find((g) => g.key === k)?.min ?? Infinity) }))
      .filter((t) => t.share >= 0.03).sort((a, b) => b.share - a.share).slice(0, 4);
    const amountText = it.portion && it.count ? `${it.count === 1 ? '' : it.count + ' × '}${it.portion.label}` : `${fmt(it.amount)} ${it.food.basis}`;
    return (
      <div className="bitem" key={it.food.ref.id}>
        <div>
          <div className="bname">{it.food.name}</div>
          <div className="bmeta"><b>{amountText}</b> · <b>{fmt(it.kcal)} kcal</b>{it.food.atHome ? ' · at home' : ''}</div>
          <div className="bmeta">{top.map((t) => `${label(t.k)} +${Math.min(999, Math.round(t.share * 100))}%`).join(' · ')}</div>
        </div>
        <button className="btn sm" disabled={!!busy} onClick={() => log([it], it.food.ref.id)} aria-label={`Log ${it.food.name}`}>{busy === it.food.ref.id ? '…' : 'Log'}</button>
      </div>
    );
  };

  const shownGaps = showAll ? gaps : gaps.slice(0, 5);
  const stillShort = gaps.filter((g) => (rec.after[g.key] ?? 0) < 0.98).map((g) => g.key);

  return (
    <section className="card gapfill" aria-label="Fill my gaps" data-testid="gap-filler">
      <div className="spread">
        <h2><span className="h-icon" aria-hidden="true">🎯</span> Fill my gaps</h2>
        <span className="tiny muted">fewest calories</span>
      </div>
      {gaps.length === 0 ? (
        <p className="small"><b>All your nutrient targets are met so far today.</b> 🎉</p>
      ) : (
        <>
          <p className="small muted">You&rsquo;re short on {gaps.length} nutrient{gaps.length === 1 ? '' : 's'} so far today.</p>

          {boosters.gaps.length > 0 && (
            <div className="bgroup" data-testid="boosters">
              <div className="bgroup-head"><span>🥬 <b>Vitamin boosters</b></span><span className="tiny muted">simple foods, under 100 kcal each</span></div>
              {boosters.items.length
                ? <div className="basket">{boosters.items.map((it) => row(it, gaps))}</div>
                : <p className="small muted">No simple low-calorie food in your list adds to these without passing a limit or a preference.</p>}
              {boosters.items.length > 1 && (
                <button className="btn sm" disabled={!!busy} onClick={() => log(boosters.items, 'boosters')}>
                  {busy === 'boosters' ? 'Logging…' : `Log all boosters (${fmt(boosters.kcal)} kcal)`}
                </button>
              )}
            </div>
          )}

          {rest.items.length > 0 && (
            <div className="bgroup" data-testid="rest">
              <div className="bgroup-head"><span>💪 <b>For {listNutrients(rest.gaps.filter((g) => rest.items.some((it) => (it.adds[g.key] ?? 0) > 0)).map((g) => g.key).slice(0, 3)) || 'what’s left'}</b></span></div>
              <div className="basket">{rest.items.map((it) => row(it, gaps))}</div>
            </div>
          )}

          {items.length > 0 && (
            <>
              <p className="small">
                Everything above: <b>{fmt(rec.kcal)} kcal</b>
                {stillShort.length ? `; still short on ${listNutrients(stillShort.slice(0, 4))}${stillShort.length > 4 ? ' and more' : ''}` : '; covers every gap'}.
                {rec.room < rec.kcal && <span className="muted"> That&rsquo;s {fmt(rec.kcal - Math.max(0, rec.room))} kcal over your calorie goal.</span>}
              </p>
              {items.length > 1 && <button className="btn primary" disabled={!!busy} onClick={() => log(items, 'all')}>{busy === 'all' ? 'Logging…' : `Log all ${items.length} (${fmt(rec.kcal)} kcal)`}</button>}
            </>
          )}

          <div className="eyebrow" style={{ marginTop: 6 }}>What you&rsquo;re short on so far today</div>
          <div className="gaplist">
            {shownGaps.map((g) => {
              const after = rec.after[g.key] ?? g.pct;
              return (
                <div className="gaprow" key={g.key} title={`${fmt(g.have, g.key)} of ${fmt(g.min, g.key)} ${unitOf(g.key)}`}>
                  <span className="gname">{label(g.key)}{g.uncertain && <span className="muted" title="Some foods you ate have no data for this, so you may have had more"> *</span>}</span>
                  <span className="gbar" aria-hidden="true">
                    <span className="gafter" style={{ width: `${Math.min(100, after * 100)}%` }} />
                    <span className="gnow" style={{ width: `${Math.min(100, g.pct * 100)}%` }} />
                  </span>
                  <span className="gpct num">{Math.round(g.pct * 100)}%{items.length > 0 && after > g.pct + 0.005 && <span className="gup"> → {Math.min(999, Math.round(after * 100))}%</span>}</span>
                </div>
              );
            })}
          </div>
          {gaps.length > 5 && <button className="btn sm ghost" style={{ justifySelf: 'start' }} onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : `Show all ${gaps.length}`}</button>}
          {gaps.some((g) => g.uncertain) && <p className="tiny muted">* Some foods you logged have no data for this nutrient, so you may have had more.</p>}
        </>
      )}
    </section>
  );
}
