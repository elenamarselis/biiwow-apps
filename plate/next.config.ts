import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const demo = process.env.NEXT_PUBLIC_DEMO === '1';
const staticExport = demo || process.env.NEXT_PUBLIC_STATIC === '1';

// Keep the demo-only in-browser store (and its bundled catalog) out of every real build.
const webpack: NextConfig['webpack'] = (cfg) => {
  if (!demo) {
    cfg.resolve.alias = { ...(cfg.resolve.alias ?? {}), [resolve(__dirname, 'src/lib/demo/client.ts')]: resolve(__dirname, 'src/lib/demo/stub.ts') };
  }
  return cfg;
};

const config: NextConfig = staticExport
  ? { reactStrictMode: true, output: 'export', images: { unoptimized: true }, webpack } // npm run build:demo / build:pages
  : {
      reactStrictMode: true,
      poweredByHeader: false,
      webpack,
      async headers() {
        return [{
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'same-origin' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ],
        }];
      },
    };
export default config;
