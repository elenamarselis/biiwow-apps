// GET /api/foods/search?q=…  USDA FoodData Central + Open Food Facts, for signed-in users only.
import { searchUsda } from '../../../src/lib/sources/usda';
import { searchOff } from '../../../src/lib/sources/off';
import type { FoodLike } from '../../../src/lib/types';
import { json, signedIn, type Ctx } from '../../../functions-lib/pages';

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  if (!(await signedIn(ctx))) return json({ error: 'Not signed in' }, 401);
  const q = (new URL(ctx.request.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  if (q.length < 2) return json({ results: [], errors: [] });
  const errors: string[] = [];
  const key = ctx.env.FDC_API_KEY;
  const [usda, off] = await Promise.all([
    key
      ? searchUsda(q, key, AbortSignal.timeout(7000)).catch((e: Error) => { errors.push(`USDA: ${e.message}`); return [] as FoodLike[]; })
      : Promise.resolve(((errors.push('USDA search is off: FDC_API_KEY is not set.'), []) as FoodLike[])),
    searchOff(q, AbortSignal.timeout(7000)).catch((e: Error) => { errors.push(`Open Food Facts: ${e.message}`); return [] as FoodLike[]; }),
  ]);
  return json({ results: [...usda, ...off], errors });
}
