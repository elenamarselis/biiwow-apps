# biiwow apps

Two Biiwow learning apps, each a static site plus a Cloudflare Pages worker (`site/_worker.js`) backed by a KV namespace bound as `PROGRESS`.

| App | Folder | Live |
|---|---|---|
| English Steps (A1–C1, Russian/English UI) | `english-steps/` | https://biiwow-english-steps.pages.dev |
| Nine Scripts (14 languages) | `nine-scripts/` | https://nine-scripts.pages.dev |

## Build

- English Steps: `cd english-steps && node build.js` → `site/index.html`, `site/manifest.webmanifest`, `site/sw.js`, copies packs.
- Nine Scripts: `cd nine-scripts && node build.js && node build-cf.js` → `index.html` (claude.ai preview) and `site/`.

The built `site/` folders are committed; the workflow deploys them as they are.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which uploads each `site/` folder with wrangler to its Cloudflare Pages project. The repository secret `CLOUDFLARE_API_TOKEN` must hold a token with "Cloudflare Pages: Edit".
