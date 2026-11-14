// Shared helpers for the Cloudflare Pages Functions in functions/ (the Pages build of the app).
// Only food search lives on Cloudflare; everything else talks to Supabase directly, protected by RLS.

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  FDC_API_KEY?: string;
}
export interface Ctx {
  request: Request;
  env: Env;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** Accept only signed-in users: Supabase checks the access token the browser sends. */
export async function signedIn(ctx: Ctx): Promise<boolean> {
  const auth = ctx.request.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ') || !ctx.env.SUPABASE_URL || !ctx.env.SUPABASE_ANON_KEY) return false;
  const res = await fetch(`${ctx.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: ctx.env.SUPABASE_ANON_KEY },
  });
  return res.ok;
}
