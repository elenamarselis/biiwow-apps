// GET /api/foods/barcode?code=…  Open Food Facts lookup, for signed-in users only.
import { offByBarcode } from '../../../src/lib/sources/off';
import { json, signedIn, type Ctx } from '../../../functions-lib/pages';

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  if (!(await signedIn(ctx))) return json({ error: 'Not signed in' }, 401);
  const code = (new URL(ctx.request.url).searchParams.get('code') ?? '').replace(/\D/g, '');
  if (code.length < 6 || code.length > 14) return json({ error: 'Enter a barcode of 6–14 digits' }, 400);
  try {
    const food = await offByBarcode(code, AbortSignal.timeout(7000));
    if (!food) return json({ error: 'Not found on Open Food Facts. Enter it from the label instead.' }, 404);
    return json({ food });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
