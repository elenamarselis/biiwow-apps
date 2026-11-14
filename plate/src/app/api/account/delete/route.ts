import { NextResponse } from 'next/server';
import { adminSupabase, requireUser } from '@/lib/supabase/server';

// Deletes all of the user's data. With { account: true } and a service role key on the
// server, also deletes the login itself.
export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { confirm?: string; account?: boolean };
  if (body.confirm !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm' }, { status: 400 });
  const { error } = await sb.rpc('delete_my_data');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (body.account) {
    const admin = adminSupabase();
    if (!admin) return NextResponse.json({ ok: true, account: false, note: 'Data deleted. The login stays because the server has no service role key.' });
    const { error: e2 } = await admin.auth.admin.deleteUser(user.id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    await sb.auth.signOut();
    return NextResponse.json({ ok: true, account: true });
  }
  return NextResponse.json({ ok: true, account: false });
}
