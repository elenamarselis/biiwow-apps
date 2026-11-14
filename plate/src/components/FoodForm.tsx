'use client';
// Manual entry: custom foods and drinks, or values copied from a product label.
// Blank nutrient fields are saved as UNKNOWN, not zero.
import { useState } from 'react';
import { NUTRIENTS, sanitize, type NutrientKey } from '@/lib/nutrients';
import type { FoodLike, Portion, UserFood } from '@/lib/types';

const MAIN: NutrientKey[] = ['energy_kcal', 'protein_g', 'carbs_g', 'sugar_g', 'fat_g', 'sat_fat_g', 'fiber_g', 'sodium_mg'];
const DRINK: NutrientKey[] = ['caffeine_mg', 'alcohol_g', 'water_g'];
const MICRO: NutrientKey[] = NUTRIENTS.filter((n) => n.group === 'vitamin' || (n.group === 'mineral' && n.key !== 'sodium_mg')).map((n) => n.key);
const ALLERGENS = ['milk', 'egg', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'wheat', 'gluten', 'soy', 'sesame'];
const ROLE_TAGS = ['breakfast', 'meal_main', 'side', 'snack', 'protein', 'dairy', 'grain', 'fruit', 'vegetable', 'legume', 'sweet', 'nuts_seeds', 'meat', 'poultry', 'fish', 'egg'];
const DRINK_TAGS = ['hot_drink', 'cold_drink', 'plain_water', 'zero_cal_drink', 'sweet_drink', 'caffeinated', 'decaf', 'alcohol', 'alcohol_free', 'juice', 'milk', 'plant_milk'];

export type FoodFormValue = Omit<FoodLike, 'source'> & { source: 'custom' | 'label'; is_favorite?: boolean; at_home?: boolean };

export function FoodForm({ initial, onSave, onCancel, busy }: {
  initial?: Partial<UserFood> | null;
  onSave: (f: FoodFormValue) => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [kind, setKind] = useState<'food' | 'drink'>(initial?.kind ?? 'food');
  const [state, setState] = useState<string>(initial?.state ?? '');
  const [fromLabel, setFromLabel] = useState(initial?.source === 'label' || !initial);
  // "per" is how the user enters values: per 100 g/ml or per serving of a given size.
  const [per, setPer] = useState<'100' | 'serving'>('100');
  const [basisUnit, setBasisUnit] = useState<'g' | 'ml'>(initial?.basis === 'ml' ? 'ml' : initial?.kind === 'drink' ? 'ml' : 'g');
  const [servingSize, setServingSize] = useState<string>(initial?.portions?.[0]?.amount ? String(initial.portions[0].amount) : '');
  const [servingLabel, setServingLabel] = useState<string>(initial?.portions?.[0]?.label ?? '');
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial?.nutrients ?? {})) o[k] = String(Math.round(Number(v) * 1000) / 1000);
    return o;
  });
  const [showMicro, setShowMicro] = useState(Object.keys(initial?.nutrients ?? {}).some((k) => MICRO.includes(k as NutrientKey)));
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [barcode, setBarcode] = useState(initial?.barcode ?? '');
  const [ingredients, setIngredients] = useState(initial?.ingredients ?? '');
  const [err, setErr] = useState<string | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, x: string) => set(list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr('Give it a name.');
    const size = Number(servingSize);
    if (per === 'serving' && !(size > 0)) return setErr(`Enter the serving size in ${basisUnit} so values can be converted.`);
    const raw = sanitize(vals);
    if (raw.energy_kcal === undefined) return setErr('Calories are needed. Leave other values blank if they are not on the label.');
    const nutrients: Record<string, number> = {};
    const mult = per === 'serving' ? 100 / size : 1;
    for (const [k, v] of Object.entries(raw)) nutrients[k] = Math.round(v * mult * 10000) / 10000;
    const portions: Portion[] = [];
    if (size > 0) portions.push({ label: servingLabel.trim() || `1 serving (${size} ${basisUnit})`, amount: size });
    onSave({
      name: name.trim(), brand: brand.trim() || null, kind, state: (state || null) as FoodLike['state'], basis: basisUnit,
      density: kind === 'drink' && basisUnit === 'ml' ? null : null, nutrients, portions,
      default_amount: size > 0 ? size : 100, max_amount: Math.max(size > 0 ? size * 3 : 300, 100),
      tags, allergens, barcode: barcode.trim() || null, ingredients: ingredients.trim() || null,
      source: fromLabel ? 'label' : 'custom',
    });
  }

  const field = (k: NutrientKey) => {
    const n = NUTRIENTS.find((x) => x.key === k)!;
    return (
      <label className="field" key={k}>
        <span>{n.label} <span className="muted tiny">{n.unit}</span></span>
        <input type="number" inputMode="decimal" step="any" min="0" value={vals[k] ?? ''} placeholder="unknown"
          onChange={(e) => setVals({ ...vals, [k]: e.target.value })} aria-label={`${n.label} (${n.unit})`} />
      </label>
    );
  };

  return (
    <form className="stack" onSubmit={submit} aria-label="Food details">
      <div className="seg" role="group" aria-label="Food or drink">
        <button type="button" aria-pressed={kind === 'food'} onClick={() => { setKind('food'); setBasisUnit('g'); }}>Food</button>
        <button type="button" aria-pressed={kind === 'drink'} onClick={() => { setKind('drink'); setBasisUnit('ml'); }}>Drink</button>
      </div>
      <label className="field">Name<input type="text" value={name} onChange={(e) => setName(e.target.value)} required /></label>
      <div className="row">
        <label className="field grow">Brand (optional)<input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} /></label>
        <label className="field" style={{ width: 130 }}>State
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">—</option><option value="raw">Raw</option><option value="cooked">Cooked</option>
            <option value="dry">Dry</option><option value="prepared">Prepared</option>
          </select>
        </label>
      </div>
      <label className="row small"><input type="checkbox" checked={fromLabel} onChange={(e) => setFromLabel(e.target.checked)} /> Values are from a product label</label>
      <div className="card flat stack" style={{ background: 'var(--surface2)' }}>
        <div className="row wrap">
          <span className="small" style={{ fontWeight: 800 }}>Values are</span>
          <div className="seg" role="group" aria-label="Values per">
            <button type="button" aria-pressed={per === '100'} onClick={() => setPer('100')}>per 100 {basisUnit}</button>
            <button type="button" aria-pressed={per === 'serving'} onClick={() => setPer('serving')}>per serving</button>
          </div>
          {kind === 'drink' && (
            <div className="seg" role="group" aria-label="Unit">
              <button type="button" aria-pressed={basisUnit === 'ml'} onClick={() => setBasisUnit('ml')}>ml</button>
              <button type="button" aria-pressed={basisUnit === 'g'} onClick={() => setBasisUnit('g')}>g</button>
            </div>
          )}
        </div>
        <div className="row">
          <label className="field grow">Serving size ({basisUnit}){per === 'serving' ? '' : ' (optional)'}
            <input type="number" inputMode="decimal" step="any" min="0" value={servingSize} onChange={(e) => setServingSize(e.target.value)} />
          </label>
          <label className="field grow">Serving name (optional)
            <input type="text" placeholder="1 bar, 1 can…" value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} />
          </label>
        </div>
      </div>
      <div className="nutgrid">{MAIN.map(field)}{kind === 'drink' && DRINK.map(field)}</div>
      <button type="button" className="btn sm ghost" onClick={() => setShowMicro(!showMicro)} aria-expanded={showMicro}>
        {showMicro ? '− Hide' : '+ Add'} vitamins and minerals
      </button>
      {showMicro && <div className="nutgrid">{MICRO.map(field)}</div>}
      <p className="muted tiny">Leave a value blank if it isn’t known. It will show as unknown and totals that depend on it are marked incomplete.</p>
      <fieldset className="stack tight" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="eyebrow">Contains (allergens)</legend>
        <div className="row wrap">{ALLERGENS.map((a) => (
          <button type="button" key={a} className="chip" aria-pressed={allergens.includes(a)} onClick={() => toggle(allergens, setAllergens, a)}>{a.replace('_', ' ')}</button>
        ))}</div>
      </fieldset>
      <fieldset className="stack tight" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="eyebrow">Kind of item (helps suggestions)</legend>
        <div className="row wrap">{(kind === 'drink' ? DRINK_TAGS : ROLE_TAGS).map((t) => (
          <button type="button" key={t} className="chip" aria-pressed={tags.includes(t)} onClick={() => toggle(tags, setTags, t)}>{t.replace(/_/g, ' ')}</button>
        ))}</div>
      </fieldset>
      <div className="row">
        <label className="field grow">Barcode (optional)<input type="text" inputMode="numeric" value={barcode} onChange={(e) => setBarcode(e.target.value)} /></label>
      </div>
      <label className="field">Ingredients (optional)<textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row">
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
        <button className="btn primary grow" disabled={busy}>{busy ? 'Saving…' : 'Save food'}</button>
      </div>
    </form>
  );
}
