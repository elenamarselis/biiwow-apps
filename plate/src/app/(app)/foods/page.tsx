'use client';
import { useState } from 'react';
import { useApp } from '@/components/AppData';
import { AddSheet, sourceLabel, type Picked } from '@/components/AddSheet';
import { FoodForm } from '@/components/FoodForm';
import { Sheet } from '@/components/Sheet';
import * as data from '@/lib/data';
import { fmt } from '@/lib/nutrients';
import { fmtYield, recipeAsFood } from '@/lib/recipes';
import { MEALS, type MealItem, type SavedMeal, type UserFood } from '@/lib/types';

type Tab = 'mine' | 'favorites' | 'home' | 'meals';

export default function FoodsPage() {
  const app = useApp();
  const [tab, setTab] = useState<Tab>('mine');
  const [editing, setEditing] = useState<UserFood | 'new' | null>(null);
  const [mealEdit, setMealEdit] = useState<SavedMeal | 'new' | null>(null);
  const [addHome, setAddHome] = useState(false);
  if (!app.ready) return <div className="card"><div className="skeleton" /></div>;

  const list = tab === 'mine' ? app.foods.filter((f) => f.source !== 'catalog')
    : tab === 'favorites' ? app.foods.filter((f) => f.is_favorite) : app.foods.filter((f) => f.at_home);

  return (
    <>
      <h1>Foods</h1>
      <div className="tabsrow" role="tablist">
        {([['mine', 'My foods'], ['favorites', 'Favourites'], ['home', 'At home'], ['meals', 'Meals & recipes']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className="chip" role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {tab !== 'meals' ? (
        <section className="card stack">
          <div className="row wrap">
            <button className="btn sm primary" onClick={() => setEditing('new')}>＋ New food or drink</button>
            {tab === 'home' && <button className="btn sm" onClick={() => setAddHome(true)}>＋ Add something I have at home</button>}
          </div>
          {list.length === 0 && <p className="muted small">{tab === 'mine' ? 'Foods you create, enter from a label, or log from USDA / Open Food Facts appear here.' : tab === 'favorites' ? 'No favourites yet.' : 'Nothing marked as at home yet. Suggestions prefer foods you have.'}</p>}
          <div className="list">
            {list.map((f) => (
              <div className="li" key={f.id}>
                <span>
                  <span className="name">{f.name}</span>{f.brand && <span className="muted small"> · {f.brand}</span>}<br />
                  <span className="meta">{f.nutrients.energy_kcal !== undefined ? `${fmt(f.nutrients.energy_kcal)} kcal / ${f.basis === 'serving' ? 'serving' : '100 ' + f.basis}` : 'kcal unknown'} · {sourceLabel(f)}{f.state ? ` · ${f.state}` : ''}</span>
                </span>
                <span className="row">
                  <button className="iconbtn sm" aria-label={f.is_favorite ? 'Remove favourite' : 'Make favourite'} aria-pressed={f.is_favorite}
                    onClick={async () => { await data.setFoodFlags(f.id, { is_favorite: !f.is_favorite }); app.reload(['foods']); }}>{f.is_favorite ? '★' : '☆'}</button>
                  <button className="iconbtn sm" aria-label={f.at_home ? 'Not at home' : 'Have at home'} aria-pressed={f.at_home} style={f.at_home ? { background: 'var(--accent-soft)' } : undefined}
                    onClick={async () => { await data.setFoodFlags(f.id, { at_home: !f.at_home }); app.reload(['foods']); }}>⌂</button>
                  {(f.source === 'custom' || f.source === 'label') && <button className="iconbtn sm" aria-label={`Edit ${f.name}`} onClick={() => setEditing(f)}>✎</button>}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="card stack">
          <button className="btn sm primary" style={{ justifySelf: 'start' }} onClick={() => setMealEdit('new')}>＋ New meal or recipe</button>
          {app.meals.length === 0 && <p className="muted small">Save a meal from Today (“Save as meal”) or build a homemade recipe here.</p>}
          <div className="list">
            {app.meals.map((m) => {
              const f = recipeAsFood(m);
              return (
                <button key={m.id} onClick={() => setMealEdit(m)}>
                  <span><span className="name">{m.name}</span><br />
                    <span className="meta">{m.kind === 'group' ? `Meal · ${m.items.length} items` : `Recipe · ${m.items.length} ingredients · ${fmtYield(m)}${f.nutrients.energy_kcal !== undefined ? ` · ${fmt(f.nutrients.energy_kcal)} kcal per ${m.yield_unit === 'g' ? '100 g' : 'serving'}` : ''}`}</span></span>
                  <span className="chip">{m.kind === 'group' ? 'Meal' : 'Recipe'}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {editing && (
        <Sheet title={editing === 'new' ? 'New food or drink' : `Edit ${editing.name}`} onClose={() => setEditing(null)} full>
          <FoodForm initial={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} onSave={async (f) => {
            await data.saveUserFood(editing === 'new' ? null : editing.id, f);
            await app.reload(['foods']);
            app.toast('Saved');
            setEditing(null);
          }} />
          {editing !== 'new' && (
            <button className="btn danger" onClick={async () => { await data.deleteUserFood(editing.id); await app.reload(['foods']); setEditing(null); }}>
              Delete this food (diary entries keep their values)
            </button>
          )}
        </Sheet>
      )}
      {addHome && (
        <AddSheet date={app.today} pickOnly onClose={() => setAddHome(false)} onPick={async (p) => {
          await data.ensureUserFood(p.food, { at_home: true });
          await app.reload(['foods']);
          app.toast(`${p.food.name} marked as at home`);
          setAddHome(false);
        }} />
      )}
      {mealEdit && <MealEditor initial={mealEdit === 'new' ? null : mealEdit} onClose={() => setMealEdit(null)} />}
    </>
  );
}

function MealEditor({ initial, onClose }: { initial: SavedMeal | null; onClose: () => void }) {
  const app = useApp();
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<'group' | 'recipe'>(initial?.kind ?? 'recipe');
  const [items, setItems] = useState<MealItem[]>(initial?.items ?? []);
  const [yieldAmt, setYieldAmt] = useState(String(initial?.yield_amount ?? ''));
  const [yieldUnit, setYieldUnit] = useState<'g' | 'serving'>(initial?.yield_unit ?? 'serving');
  const [defMeal, setDefMeal] = useState(initial?.default_meal ?? '');
  const [picking, setPicking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const preview = recipeAsFood({ id: '', name, kind, items, yield_amount: Number(yieldAmt) || null, yield_unit: yieldUnit, default_meal: null, is_favorite: false });

  function addItem(p: Picked) {
    setItems([...items, {
      position: items.length, food_id: p.food.id ?? null, name: p.food.name, brand: p.food.brand ?? null, kind: p.food.kind, state: p.food.state ?? null,
      basis: p.food.basis, density: p.food.density ?? null, nutrients: p.food.nutrients, amount: p.amount, unit: p.food.basis,
      portion_label: p.portion && p.count ? `${p.count} × ${p.portion.label}` : null, tags: p.food.tags ?? [], allergens: p.food.allergens ?? [],
    }]);
    setPicking(false);
  }

  async function save() {
    setErr(null);
    if (!name.trim()) return setErr('Give it a name.');
    if (!items.length) return setErr('Add at least one ingredient.');
    if (kind === 'recipe' && !(Number(yieldAmt) > 0)) return setErr('Enter the recipe yield: total cooked weight or number of servings.');
    await data.saveMeal({ id: initial?.id, name: name.trim(), kind, items, yield_amount: kind === 'recipe' ? Number(yieldAmt) : null,
      yield_unit: kind === 'recipe' ? yieldUnit : null, default_meal: (defMeal || null) as SavedMeal['default_meal'], is_favorite: initial?.is_favorite ?? true });
    await app.reload(['meals']);
    app.toast('Saved');
    onClose();
  }

  if (picking) return <AddSheet date={app.today} pickOnly onClose={() => setPicking(false)} onPick={addItem} />;
  return (
    <Sheet title={initial ? `Edit ${initial.name}` : 'New meal or recipe'} onClose={onClose} full>
      <div className="seg" role="group">
        <button aria-pressed={kind === 'recipe'} onClick={() => setKind('recipe')}>Homemade recipe</button>
        <button aria-pressed={kind === 'group'} onClick={() => setKind('group')}>Meal (group of items)</button>
      </div>
      <p className="muted small">{kind === 'recipe'
        ? 'Ingredients are added up and divided by the yield. Log how much you ate in grams or servings.'
        : 'Adds each item to your diary separately, in one step.'}</p>
      <label className="field">Name<input type="text" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="eyebrow">Ingredients</div>
      <div className="list">
        {items.map((it, i) => (
          <div className="li" key={i}>
            <span><span className="name">{it.name}</span><br /><span className="meta">{fmt(it.amount)} {it.basis}{it.state ? ` · ${it.state}` : ''}</span></span>
            <button className="iconbtn sm" aria-label={`Remove ${it.name}`} onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
      </div>
      <button className="btn sm" style={{ justifySelf: 'start' }} onClick={() => setPicking(true)}>＋ Add ingredient</button>
      {kind === 'recipe' && (
        <div className="row">
          <label className="field grow">Recipe yield<input type="number" inputMode="decimal" min="0" step="any" value={yieldAmt} onChange={(e) => setYieldAmt(e.target.value)} aria-label="Recipe yield" /></label>
          <label className="field grow">Unit
            <select value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value as 'g' | 'serving')}>
              <option value="serving">servings</option><option value="g">g cooked weight</option>
            </select>
          </label>
        </div>
      )}
      <label className="field">Usually for
        <select value={defMeal} onChange={(e) => setDefMeal(e.target.value)}><option value="">—</option>{MEALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
      </label>
      {kind === 'recipe' && items.length > 0 && Number(yieldAmt) > 0 && (
        <p className="small num">Per {yieldUnit === 'g' ? '100 g' : 'serving'}: {preview.nutrients.energy_kcal !== undefined ? `${fmt(preview.nutrients.energy_kcal)} kcal` : 'kcal unknown'}
          {preview.nutrients.protein_g !== undefined ? ` · ${fmt(preview.nutrients.protein_g)} g protein` : ''}</p>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row">
        {initial && <button className="btn danger" onClick={async () => { await data.deleteMeal(initial.id); await app.reload(['meals']); onClose(); }}>Delete</button>}
        <button className="btn primary grow" onClick={save}>Save</button>
      </div>
    </Sheet>
  );
}
