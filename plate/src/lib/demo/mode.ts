/** True in the static demo build (data in this browser only, no login, no sync). */
export const DEMO = process.env.NEXT_PUBLIC_DEMO === '1';
/**
 * True in the static Cloudflare Pages build of the real app: Supabase login and data from the
 * browser (RLS still protects every row), with Pages Functions for food search only.
 */
export const STATIC = process.env.NEXT_PUBLIC_STATIC === '1';
/** Any build without this app's Node server (demo or Cloudflare Pages). */
export const NO_SERVER = DEMO || STATIC;
