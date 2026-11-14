import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase/server';

// Invite and magic-link emails land here; exchange the code for a session.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/today';
  if (code) {
    const sb = await serverSupabase();
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/today', url.origin));
}
