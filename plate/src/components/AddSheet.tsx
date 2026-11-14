'use client';
// "Add food or drink": recent items and favourites are shown immediately from memory;
// search covers your foods + the generic catalog instantly, then USDA / Open Food Facts.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet } from './Sheet';
import { FoodForm } from './FoodForm';
import { findUserFood, useApp } from './AppData';
import * as data from '@/lib/data';
import { entryFromFood } from '@/lib/entries';
import { fmt, scale, NUTRIENTS } from '@/lib/nutrients';
import { recipeAsFood, fmtYield } from '@/lib/recipes';
import { upcomingMeal } from '@/lib/recommend';
import { localHour } from '@/lib/dates';
import { MEALS, type Entry, type FoodLike, type Meal, type Portion, type SavedMeal, type Status } from '@/lib/types';

export type Pickable = FoodLike & { id?: string; catalogId?: string | null; mealRef?: SavedMeal; lastAmount?: number };
export interface Picked { food: Pickable; amount: number; portion: Portion | null; count: number | null }

type Tab = 'recent' | 'favorites' | 'home' | 'meals';

export function AddSheet({ date, meal: initialMeal, parent, pickOnly, onClose, onAdded, onPick }: {
  date: string;
  meal?: Meal | null;
  parent?: Entry | null;
  pickOnly?: boolean;
  onClose: () => void;
  onAdded?: (entries: Entry[]) => void;
  onPick?: (p: Picked) => void;
}) {
  const app = useApp();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>(parent ? 'favorites' : 'recent');
  const [picked, setPicked] = useState<Pickable | null>(null);
  const [step, setStep] = useState<'browse' | 'custom' | 'barcode'>('browse');
  const [online, setOnline] = useState<{ q: string; results: FoodLike[]; errors: string[]; loading: boolean }>({ q: '', results: [], errors: [], loading: false });

  const library = useMemo<Pickable[]>(() => {
    const own = app.foods.filter((f) => f.source !== 'catalog').map((f) => ({ ...f }));
    const cat = app.catalog.map((c) => ({ ...c, catalogId: c.id, source: 'catalog' }));
    return [...own, ...cat];
  }, [app.foods, app.catalog]);

  const favs = useMemo<Pickable[]>(() => app.foods.filter((f) => f.is_favorite).map((f) => withCatalog(f, app.catalog)), [app.foods, app.catalog]);
  const home = useMemo<Pickable[]>(() => app.foods.filter((f) => f.at_home).map((f) => withCatalog(f, app.catalog)), [app.foods, app.catalog]);
  const recent = useMemo<Pickable[]>(() => app.recent.map((r) => ({ ...r, id: r.foodId ?? undefined, catalogId: r.catalogId })), [app.recent]);

  const local = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const hay = (f: Pickable) => `${f.name} ${f.brand ?? ''} ${f.state ?? ''} ${f.kind}`.toLowerCase();
    const seen = new Set<string>();
    const out: Pickable[] = [];
    for (const f of [...recent, ...library]) {
      const key = `${f.name}|${f.brand ?? ''}`;
      if (seen.has(key)) continue;
      if (words.every((w) => hay(f).includes(w))) { seen.add(key); out.push(f); }
    }
    const meals = pickOnly || parent ? [] : app.meals.filter((m) => words.every((w) => m.name.toLowerCase().includes(w)))
      .map((m) => ({ ...recipeAsFood(m), name: m.name, mealRef: m } as Pickable));
    return [...meals, ...out].slice(0, 40);
  }, [q, recent, library, app.meals, pickOnly, parent]);

  // debounced online search
  const timer = useRef<number | null>(null);
  useEffect(() => {
    const term = q.trim();
    if (timer.current) window.clearTimeout(timer.current);
    if (term.length < 3) { setOnline({ q: '', results: [], errors: [], loading: false }); return; }
    timer.current = window.setTimeout(async () => {
      setOnline((o) => ({ ...o, loading: true }));
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(term)}`);
        const json = (await res.json()) as { results?: FoodLike[]; errors?: string[]; error?: string };
        setOnline({ q: term, results: json.results ?? [], errors: json.errors ?? (json.error ? [json.error] : []), loading: false });
      } catch (e) {
        setOnline({ q: term, results: [], errors: [(e as Error).message], loading: false });
      }
    }, 450);
  }, [q]);

  const title = parent ? `Add to ${parent.name}` : pickOnly ? 'Choose an ingredient' : 'Add food or drink';

  if (picked) {
    return (
      <Sheet title={picked.mealRef?.kind === 'group' ? 'Add saved meal' : 'How much?'} onClose={onClose} full>
        <button className="btn sm ghost" onClick={() => setPicked(null)} style={{ justifySelf: 'start' }}>‹ Back</button>
        <AmountStep food={picked} date={date} initialMeal={parent ? parent.meal : initialMeal ?? null} parent={parent ?? null}
          pickOnly={pickOnly} onPick={onPick} onAdded={(e) => { onAdded?.(e); onClose(); }} />
      </Sheet>
    );
  }
  if (step === 'custom') {
    return (
      <Sheet title="New food or drink" onClose={onClose} full>
        <CustomStep onBack={() => setStep('browse')} onCreated={(f) => setPicked(f)} />
      </Sheet>
    );
  }
  if (step === 'barcode') {
    return (
      <Sheet title="Packaged product" onClose={onClose} full>
        <BarcodeStep onBack={() => setStep('browse')} onFound={(f) => setPicked(f)} onManual={() => setStep('custom')} />
      </Sheet>
    );
  }

  const tabList: Pickable[] = tab === 'recent' ? recent : tab === 'favorites' ? favs : tab === 'home' ? home : [];
  return (
    <Sheet title={title} onClose={onClose} full>
      <input type="search" autoFocus placeholder="Search foods and drinks" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search foods and drinks" />
      <div className="row wrap">
        <button className="btn sm" onClick={() => setStep('custom')}>+ Create custom</button>
        <button className="btn sm" onClick={() => setStep('barcode')}>Barcode / packaged</button>
      </div>
      {q.trim() ? (
        <>
          <FoodList items={local} onPick={setPicked} empty="Nothing in your foods or the catalog matches." />
          <div className="eyebrow">USDA FoodData Central &amp; Open Food Facts</div>
          {online.loading && <div className="skeleton" aria-label="Searching" />}
          {!online.loading && online.q && <FoodList items={online.results} onPick={setPicked} empty="No online matches." />}
          {online.errors.map((e) => <p key={e} className="muted tiny">{e}</p>)}
          {q.trim().length < 3 && <p className="muted tiny">Type 3 or more letters to search online.</p>}
        </>
      ) : (
        <>
          <div className="tabsrow" role="tablist">
            {(['recent', 'favorites', 'home', ...(pickOnly || parent ? [] : ['meals'])] as Tab[]).map((t) => (
              <button key={t} role="tab" className="chip" aria-pressed={tab === t} aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === 'recent' ? 'Recent' : t === 'favorites' ? 'Favourites' : t === 'home' ? 'At home' : 'My meals'}
              </button>
            ))}
          </div>
          {tab === 'meals' ? (
            <div className="list">
              {app.meals.length === 0 && <p className="muted small">No saved meals yet. Save one from a meal on Today, or build a recipe in Foods.</p>}
              {app.meals.map((m) => (
                <button key={m.id} onClick={() => setPicked({ ...recipeAsFood(m), name: m.name, mealRef: m })}>
                  <span><span className="name">{m.name}</span><br /><span className="meta">{m.kind === 'group' ? `${m.items.length} items` : `Recipe · ${fmtYield(m)}`}</span></span>
                  <span className="chip">{m.kind === 'group' ? 'Meal' : 'Recipe'}</span>
                </button>
              ))}
            </div>
          ) : (
            <FoodList items={tabList} onPick={setPicked} empty={
              tab === 'recent' ? 'Nothing logged yet. Search above to add your first item.'
                : tab === 'favorites' ? 'No favourites yet. Tap ☆ when adding an item.' : 'Mark foods you have at home with ⌂ when adding them, or in Foods.'
            } />
          )}
        </>
      )}
    </Sheet>
  );
}

function withCatalog(f: Pickable & { source?: string | null; source_id?: string | null }, catalog: { id: string }[]): Pickable {
  if (f.source === 'catalog' && f.source_id && catalog.some((c) => c.id === f.source_id)) return { ...f, catalogId: f.source_id, id: undefined };
  return f;
}

export function sourceLabel(f: Pick<FoodLike, 'source'>): string {
  switch (f.source) {
    case 'usda': return 'USDA';
    case 'off': return 'Open Food Facts';
    case 'catalog': return 'USDA';
    case 'label': return 'Label';
    case 'recipe': return 'Recipe';
    case 'meal': return 'Saved meal';
    default: return 'Custom';
  }
}

function FoodList({ items, onPick, empty }: { items: Pickable[]; onPick: (f: Pickable) => void; empty: string }) {
  if (!items.length) return <p className="muted small">{empty}</p>;
  return (
    <div className="list">
      {items.map((f, i) => {
        const kcal = f.nutrients.energy_kcal;
        const per = f.basis === 'serving' ? 'serving' : `100 ${f.basis}`;
        return (
          <button key={`${f.name}-${f.brand}-${i}`} onClick={() => onPick(f)}>
            <span>
              <span className="name">{f.name}</span>{f.brand && <span className="muted small"> · {f.brand}</span>}
              <br />
              <span className="meta">
                {kcal !== undefined ? `${fmt(kcal)} kcal / ${per}` : 'calories unknown'}
                {f.lastAmount ? ` · last ${fmt(f.lastAmount)} ${f.basis}` : ''}
              </span>
            </span>
            <span className="row">
              {f.state && <span className="chip">{f.state}</span>}
              {f.kind === 'drink' && <span className="chip drink">drink</span>}
              <span className="chip">{f.mealRef ? (f.mealRef.kind === 'group' ? 'Meal' : 'Recipe') : sourceLabel(f)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AmountStep({ food, date, initialMeal, parent, pickOnly, onPick, onAdded }: {
  food: Pickable; date: string; initialMeal: Meal | null; parent: Entry | null; pickOnly?: boolean;
  onPick?: (p: Picked) => void; onAdded: (e: Entry[]) => void;
}) {
  const app = useApp();
  const portions = food.portions ?? [];
  const isGroup = food.mealRef?.kind === 'group';
  const defaultMeal: Meal = parent ? parent.meal : initialMeal ?? food.mealRef?.default_meal ?? (food.kind === 'drink' ? 'drinks' : upcomingMeal(localHour()));
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const defaultStatus: Status = date < app.today ? 'consumed' : date > app.today ? 'planned'
    : parent ? parent.status === 'skipped' ? 'planned' : parent.status : 'planned';
  const [status, setStatus] = useState<Status>(defaultStatus);
  const firstPortion = food.lastAmount ? null : portions[0] ?? null;
  const [portion, setPortion] = useState<Portion | null>(firstPortion);
  const [count, setCount] = useState<string>('1');
  const startAmount = food.lastAmount ?? food.default_amount ?? (food.basis === 'serving' ? 1 : 100);
  const [amountStr, setAmountStr] = useState<string>(String(firstPortion ? firstPortion.amount : startAmount));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amount = portion ? (Number(count) || 0) * portion.amount : Number(amountStr) || 0;
  const n = scale(food.nutrients, amount, food.basis);
  const unknown = NUTRIENTS.filter((x) => food.nutrients[x.key] === undefined && (food.kind === 'drink' || x.group !== 'drink')).map((x) => x.label);
  const unitLabel = food.basis === 'serving' ? 'servings' : food.basis;

  const userCopy = findUserFood(app.foods, food);
  async function toggleFlag(flag: 'is_favorite' | 'at_home') {
    try {
      if (userCopy) await data.setFoodFlags(userCopy.id, { [flag]: !userCopy[flag] });
      else await data.ensureUserFood(food, { [flag]: true });
      await app.reload(['foods']);
    } catch (e) { setErr((e as Error).message); }
  }

  async function save() {
    setErr(null);
    if (isGroup && food.mealRef) {
      setBusy(true);
      try {
        const added = await data.addSavedMeal(food.mealRef, { date, meal, status });
        app.toast(`Added ${food.mealRef.name}`);
        await app.reload(['recent']);
        onAdded(added);
      } catch (e) { setErr((e as Error).message); setBusy(false); }
      return;
    }
    if (!(amount > 0)) return setErr('Enter an amount greater than zero.');
    if (pickOnly && onPick) { onPick({ food, amount, portion, count: portion ? Number(count) : null }); return; }
    setBusy(true);
    try {
      // External results are saved to your foods so they appear in Recent/Favourites with stable values.
      let src: Pickable = food;
      if ((food.source === 'usda' || food.source === 'off') && !food.id) {
        const saved = await data.ensureUserFood(food);
        src = { ...food, id: saved.id };
      }
      const ne = entryFromFood(src, { date, meal: parent ? parent.meal : meal, amount, status, portion, portionCount: portion ? Number(count) : null, parentId: parent?.id ?? null });
      if (food.mealRef) Object.assign(ne, { meal_id: food.mealRef.id });
      const added = await data.insertEntries([ne]);
      app.toast(`${status === 'consumed' ? 'Logged' : 'Planned'} ${food.name}`);
      app.reload(['recent', 'foods']);
      onAdded(added);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h2 style={{ overflowWrap: 'anywhere' }}>{food.name}</h2>
        <div className="row wrap small muted" style={{ marginTop: 4 }}>
          {food.brand && <span>{food.brand}</span>}
          {food.state && <span className="chip">{food.state}</span>}
          {food.kind === 'drink' && <span className="chip drink">drink</span>}
          <span className="tiny">{food.source_ref ?? sourceLabel(food)}</span>
        </div>
      </div>

      {isGroup && food.mealRef ? (
        <div className="list">
          {food.mealRef.items.map((it, i) => <div className="li" key={i}><span>{it.name}</span><span className="muted small">{fmt(it.amount)} {it.basis}</span></div>)}
        </div>
      ) : (
        <>
          <div className="row wrap" role="group" aria-label="Portion">
            {portions.map((p) => (
              <button key={p.label} className="chip" aria-pressed={portion?.label === p.label} onClick={() => { setPortion(p); setCount('1'); }}>{p.label}</button>
            ))}
            <button className="chip" aria-pressed={!portion} onClick={() => { if (portion) setAmountStr(String(amount || startAmount)); setPortion(null); }}>{unitLabel}</button>
          </div>
          {portion ? (
            <label className="field">How many? <span className="muted tiny">({portion.label} = {fmt(portion.amount)} {unitLabel})</span>
              <input type="number" inputMode="decimal" step="0.25" min="0" value={count} onChange={(e) => setCount(e.target.value)} aria-label="Number of portions" />
            </label>
          ) : (
            <label className="field">Amount ({unitLabel})
              <input type="number" inputMode="decimal" step="any" min="0" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} aria-label={`Amount in ${unitLabel}`} />
            </label>
          )}
        </>
      )}

      {!pickOnly && !parent && (
        <label className="field">Meal
          <select value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
            {MEALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
      )}
      {!pickOnly && (
        <div className="seg" role="group" aria-label="Planned or had">
          <button aria-pressed={status === 'planned'} onClick={() => setStatus('planned')}>Planned</button>
          <button aria-pressed={status === 'consumed'} onClick={() => setStatus('consumed')}>{food.kind === 'drink' ? 'Already drank' : 'Already ate'}</button>
        </div>
      )}

      {!isGroup && (
        <div className="card flat">
          <div className="kv num">
            <span>Calories</span><b>{n.energy_kcal !== undefined ? `${fmt(n.energy_kcal)} kcal` : 'unknown'}</b>
            {(['protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g'] as const).map((k) => (
              <Frag key={k} k={k} v={n[k]} />
            ))}
            {food.kind === 'drink' && (['caffeine_mg', 'alcohol_g'] as const).map((k) => <Frag key={k} k={k} v={n[k]} />)}
          </div>
          {unknown.length > 0 && <p className="muted tiny" style={{ marginTop: 6 }}>Unknown for this item: {unknown.join(', ')}. Totals that include it are marked incomplete.</p>}
        </div>
      )}

      {!food.mealRef && !pickOnly && (
        <div className="row wrap">
          <button className="chip" aria-pressed={!!userCopy?.is_favorite} onClick={() => toggleFlag('is_favorite')}>{userCopy?.is_favorite ? '★ Favourite' : '☆ Favourite'}</button>
          <button className="chip" aria-pressed={!!userCopy?.at_home} onClick={() => toggleFlag('at_home')}>⌂ {userCopy?.at_home ? 'At home' : 'Have at home'}</button>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn primary block" onClick={save} disabled={busy}>
        {busy ? 'Saving…' : pickOnly ? 'Use this' : status === 'consumed' ? 'Log it' : 'Add to plan'}
      </button>
    </div>
  );
}

function Frag({ k, v }: { k: (typeof NUTRIENTS)[number]['key']; v: number | undefined }) {
  const meta = NUTRIENTS.find((x) => x.key === k)!;
  return (<><span>{meta.label}</span>{v === undefined ? <span className="u">unknown</span> : <span>{fmt(v)} {meta.unit}</span>}</>);
}

function CustomStep({ onBack, onCreated, initial }: { onBack: () => void; onCreated: (f: Pickable) => void; initial?: Partial<FoodLike> }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="stack">
      <button className="btn sm ghost" onClick={onBack} style={{ justifySelf: 'start' }}>‹ Back</button>
      <FoodForm initial={initial as never} busy={busy} onSave={async (f) => {
        setBusy(true);
        try {
          const saved = await data.saveUserFood(null, f);
          await app.reload(['foods']);
          onCreated(saved);
        } catch (e) { setErr((e as Error).message); setBusy(false); }
      }} />
      {err && <p className="err">{err}</p>}
    </div>
  );
}

function BarcodeStep({ onBack, onFound, onManual }: { onBack: () => void; onFound: (f: Pickable) => void; onManual: () => void }) {
  const app = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function look(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const mine = app.foods.find((f) => f.barcode === code.trim());
    if (mine) { onFound(mine); return; }
    try {
      const res = await fetch(`/api/foods/barcode?code=${encodeURIComponent(code.trim())}`);
      const json = (await res.json()) as { food?: FoodLike; error?: string };
      if (!res.ok || !json.food) throw new Error(json.error ?? 'Not found');
      onFound(json.food);
    } catch (e2) { setErr((e2 as Error).message); setBusy(false); }
  }
  return (
    <form className="stack" onSubmit={look}>
      <button type="button" className="btn sm ghost" onClick={onBack} style={{ justifySelf: 'start' }}>‹ Back</button>
      <p className="muted small">Type the barcode number from the pack to look it up on Open Food Facts. Values not on the listing will show as unknown.</p>
      <label className="field">Barcode<input type="text" inputMode="numeric" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 5000000000017" /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row">
        <button className="btn primary grow" disabled={busy || code.trim().length < 6}>{busy ? 'Looking up…' : 'Look up'}</button>
        <button type="button" className="btn" onClick={onManual}>Enter from label</button>
      </div>
    </form>
  );
}
