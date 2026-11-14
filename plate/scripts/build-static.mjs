// Static builds without the Node server (API routes, auth callback, middleware):
//   node scripts/build-static.mjs demo   → demo-out/   data in the browser, no login (npm run build:demo)
//   node scripts/build-static.mjs cloud  → pages-out/  real app on Cloudflare Pages: Supabase login and data
//                                                       from the browser, food search in functions/ (npm run build:pages)
// The cloud build needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (both public).
import { cpSync, rmSync, writeFileSync, existsSync, symlinkSync, readdirSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const mode = process.argv[2];
if (!['demo', 'cloud'].includes(mode)) throw new Error('Usage: node scripts/build-static.mjs demo|cloud');
const root = process.cwd();
const dir = join(root, '.static-build');
const outName = mode === 'demo' ? 'demo-out' : 'pages-out';
const env = { ...process.env };
if (mode === 'demo') Object.assign(env, { NEXT_PUBLIC_DEMO: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://demo.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'demo' });
else {
  if (!/^https?:\/\//.test(env.NEXT_PUBLIC_SUPABASE_URL ?? '') || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL (https://…supabase.co) and NEXT_PUBLIC_SUPABASE_ANON_KEY for the cloud build.');
  }
  Object.assign(env, { NEXT_PUBLIC_STATIC: '1', NEXT_PUBLIC_DEMO: '' });
}

rmSync(dir, { recursive: true, force: true });
const skip = ['node_modules', '.next', '.static-build', '.demo-build', 'demo-out', 'pages-out', 'test-results', '.git', '.env.local', 'functions',
  'src/app/api', 'src/app/auth', 'src/middleware.ts', 'src/lib/supabase/server.ts'];
mkdirSync(dir);
for (const name of readdirSync(root)) {
  if (skip.includes(name)) continue;
  cpSync(join(root, name), join(dir, name), { recursive: true, filter: (src) => !skip.some((s) => src === join(root, s)) });
}
symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
// Static root page: send people to Today (which sends signed-out visitors to /login).
writeFileSync(join(dir, 'src/app/page.tsx'), `'use client';
import { useEffect } from 'react';
export default function Home() { useEffect(() => { window.location.replace('/today'); }, []); return null; }
`);
execSync('npx next build', { cwd: dir, stdio: 'inherit', env });
rmSync(join(root, outName), { recursive: true, force: true });
cpSync(join(dir, 'out'), join(root, outName), { recursive: true });
if (!existsSync(join(root, outName, 'today.html'))) throw new Error(`${outName} is missing today.html`);
console.log(`Static ${mode} build ready in ${outName}/`);
