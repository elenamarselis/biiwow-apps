'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as data from '@/lib/data';
import { STATIC } from '@/lib/demo/mode';
import { supabase } from '@/lib/supabase/client';
import { localDate } from '@/lib/dates';
import type { Candidate } from '@/lib/recommend';
import type { CatalogFood, FoodLike, Profile, SavedMeal, Targets, UserFood } from '@/lib/types';

type Recent = Awaited<ReturnType<typeof data.loadRecent>>[number];

interface Ctx {
  ready: boolean;
  error: string | null;
  profile: Profile | null;
  targets: Targets[];
  catalog: CatalogFood[];
  foods: UserFood[];
  meals: SavedMeal[];
  recent: Recent[];
  today: string;
  candidates: Candidate[];
  reload: (what?: ('profile' | 'targets' | 'foods' | 'meals' | 'recent' | 'catalog')[]) => Promise<void>;
  toast: (msg: string) => void;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [targets, setTargets] = useState<Targets[]>([]);
  const [catalog, setCatalog] = useState<CatalogFood[]>([]);
  const [foods, setFoods] = useState<UserFood[]>([]);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const reload = useCallback<Ctx['reload']>(async (what) => {
    const all = !what;
    const want = (k: string) => all || what!.includes(k as never);
    try {
      await Promise.all([
        want('profile') && data.loadProfile().then(setProfile),
        want('targets') && data.loadTargets().then(setTargets),
        want('catalog') && data.loadCatalog().then(setCatalog),
        want('foods') && data.loadUserFoods().then(setFoods),
        want('meals') && data.loadMeals().then(setMeals),
        want('recent') && data.loadRecent().then(setRecent),
      ]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (STATIC) {
        // Cloudflare Pages build has no middleware: check the session here.
        const { data: u } = await supabase().auth.getUser();
        if (!u.user) { window.location.replace('/login'); return; }
      }
      await reload();
      setReady(true);
    })();
  }, [reload]);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    window.setTimeout(() => setToastMsg((cur) => (cur === m ? null : cur)), 2600);
  }, []);

  const today = localDate(new Date(), profile?.timezone && profile.timezone !== 'UTC' ? profile.timezone : undefined);

  const candidates = useMemo<Candidate[]>(() => {
    const byCatalog = new Map(foods.filter((f) => f.source === 'catalog' && f.source_id).map((f) => [f.source_id!, f]));
    const out: Candidate[] = catalog.map((c) => {
      const u = byCatalog.get(c.id);
      return { ...c, ref: { type: 'catalog', id: c.id }, favorite: u?.is_favorite, atHome: u?.at_home };
    });
    for (const f of foods) {
      if (f.source === 'catalog') continue;
      out.push({ ...f, ref: { type: 'food', id: f.id }, favorite: f.is_favorite, atHome: f.at_home });
    }
    return out;
  }, [catalog, foods]);

  const value: Ctx = { ready, error, profile, targets, catalog, foods, meals, recent, today, candidates, reload, toast };
  return (
    <AppCtx.Provider value={value}>
      {children}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </AppCtx.Provider>
  );
}

/** Find the user's stored copy of a food (for favourite / at-home flags). */
export function findUserFood(foods: UserFood[], f: FoodLike & { id?: string; catalogId?: string | null }): UserFood | undefined {
  if (f.catalogId) return foods.find((u) => u.source === 'catalog' && u.source_id === f.catalogId);
  if (f.id) { const byId = foods.find((u) => u.id === f.id); if (byId) return byId; }
  if (f.source_id) return foods.find((u) => u.source === f.source && u.source_id === f.source_id);
  return undefined;
}
