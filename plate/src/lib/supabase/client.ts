'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Browser client. Uses the public (anon / publishable) key; RLS protects the data. */
export function supabase(): SupabaseClient {
  if (!client) {
    if (process.env.NEXT_PUBLIC_DEMO === '1') {
      // Static demo build: an in-browser stand-in (see src/lib/demo/client.ts). Dropped from normal builds.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      client = require('../demo/client').demoClient() as unknown as SupabaseClient;
    } else {
      client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    }
  }
  return client;
}
