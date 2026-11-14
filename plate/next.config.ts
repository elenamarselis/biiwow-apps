import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const demo = process.env.NEXT_PUBLIC_DEMO === '1';

const config: NextConfig = demo
  ? { reactStrictMode: true, output: 'export', images: { unoptimized: true } } // static demo (npm run build:demo)
  : {
      reactStrictMode: true,
      poweredByHeader: false,
      webpack(cfg) {
        // keep the demo-only in-browser store out of the real app
        cfg.resolve.alias = { ...(cfg.resolve.alias ?? {}), [resolve(__dirname, 'src/lib/demo/client.ts')]: resolve(__dirname, 'src/lib/demo/stub.ts') };
        return cfg;
      },
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
