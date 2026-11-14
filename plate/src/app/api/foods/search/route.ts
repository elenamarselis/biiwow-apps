import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { searchUsda } from '@/lib/sources/usda';
import { searchOff } from '@/lib/sources/off';
import { mockSearch } from '@/lib/sources/mock';
import type { FoodLike } from '@/lib/types';

// Server-side proxy for USDA FoodData Central and Open Food Facts so the USDA key stays private.
export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [], errors: [] });

  if (process.env.FOOD_SOURCES_MOCK === '1') return NextResponse.json({ results: mockSearch(q), errors: [] });

  const errors: string[] = [];
  const timeout = () => AbortSignal.timeout(7000);
  const key = process.env.FDC_API_KEY;
  const [usda, off] = await Promise.all([
    key
      ? searchUsda(q, key, timeout()).catch((e: Error) => { errors.push(`USDA: ${e.message}`); return [] as FoodLike[]; })
      : Promise.resolve(((errors.push('USDA search is off: FDC_API_KEY is not set.'), []) as FoodLike[])),
    searchOff(q, timeout()).catch((e: Error) => { errors.push(`Open Food Facts: ${e.message}`); return [] as FoodLike[]; }),
  ]);
  return NextResponse.json({ results: [...usda, ...off], errors });
}
