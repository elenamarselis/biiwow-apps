// Builds the static demo (no server, no Supabase: data lives in the browser) into demo-out/.
// Copies the app to .demo-build/ without the server-only parts (API routes, auth callback,
// middleware), then runs `next build` with output: 'export'.
import { cpSync, rmSync, writeFileSync, existsSync, symlinkSync, readdirSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const dir = join(root, '.demo-build');
rmSync(dir, { recursive: true, force: true });
const skip = ['node_modules', '.next', '.demo-build', 'demo-out', 'test-results', '.git', 'src/app/api', 'src/app/auth', 'src/middleware.ts', 'src/lib/supabase/server.ts'];
mkdirSync(dir);
for (const name of readdirSync(root)) {
  if (skip.includes(name)) continue;
  cpSync(join(root, name), join(dir, name), { recursive: true, filter: (src) => !skip.some((s) => src === join(root, s)) });
}
symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
// Static root page: send people to Today.
writeFileSync(join(dir, 'src/app/page.tsx'), `'use client';
import { useEffect } from 'react';
export default function Home() { useEffect(() => { window.location.replace('/today'); }, []); return null; }
`);
execSync('npx next build', { cwd: dir, stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_DEMO: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://demo.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'demo' } });
rmSync(join(root, 'demo-out'), { recursive: true, force: true });
cpSync(join(dir, 'out'), join(root, 'demo-out'), { recursive: true });
if (!existsSync(join(root, 'demo-out/today.html'))) throw new Error('demo build missing today.html');
console.log('Static demo ready in demo-out/');
