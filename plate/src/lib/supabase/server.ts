import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/** Server client acting as the signed-in user (RLS applies). */
export async function serverSupabase() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component; middleware refreshes the session */
        }
      },
    },
  });
}

/** Admin client. Server-only; needs SUPABASE_SERVICE_ROLE_KEY. Bypasses RLS: use sparingly. */
export function adminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireUser() {
  const sb = await serverSupabase();
  const { data } = await sb.auth.getUser();
  return { sb, user: data.user };
}
