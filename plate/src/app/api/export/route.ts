import { requireUser } from '@/lib/supabase/server';
import { diaryCsv } from '@/lib/csv';
import type { Entry } from '@/lib/types';

// CSV export of the signed-in user's diary. Runs as the user, so RLS limits it to their rows.
export async function GET() {
  const { sb, user } = await requireUser();
  if (!user) return new Response('Not signed in', { status: 401 });
  const all: Entry[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('diary_entries').select('*')
      .order('entry_date').order('meal').order('position').order('created_at').range(from, from + 999);
    if (error) return new Response(error.message, { status: 500 });
    all.push(...((data ?? []) as Entry[]));
    if (!data || data.length < 1000) break;
  }
  return new Response(diaryCsv(all), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="plate-diary-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
