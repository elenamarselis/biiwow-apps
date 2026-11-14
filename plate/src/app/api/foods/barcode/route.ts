import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { offByBarcode } from '@/lib/sources/off';
import { mockBarcode } from '@/lib/sources/mock';

export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const code = (new URL(req.url).searchParams.get('code') ?? '').replace(/\D/g, '');
  if (code.length < 6 || code.length > 14) return NextResponse.json({ error: 'Enter a barcode of 6–14 digits' }, { status: 400 });
  try {
    const food = process.env.FOOD_SOURCES_MOCK === '1' ? mockBarcode(code) : await offByBarcode(code, AbortSignal.timeout(7000));
    if (!food) return NextResponse.json({ error: 'Not found on Open Food Facts. Enter it from the label instead.' }, { status: 404 });
    return NextResponse.json({ food });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
