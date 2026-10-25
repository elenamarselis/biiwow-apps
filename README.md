# biiwow apps

Two Biiwow learning apps, each a static site plus a Cloudflare Pages worker (`site/_worker.js`) backed by a KV namespace bound as `PROGRESS`.

| App | Folder | Live |
|---|---|---|
| English Steps (A1–C1, Russian/English UI) | `english-steps/` | https://biiwow-english-steps.pages.dev |
| Nine Scripts (14 languages) | `nine-scripts/` | https://nine-scripts.pages.dev |
| Serbian Steps (A1–C2) | `serbian-steps/` | https://biiwow-serbian-steps.pages.dev |
| Hungarian Steps (A1–C2) | `hungarian-steps/` | https://biiwow-hungarian-steps.pages.dev |
| Spanish Steps (A1–C2) | `spanish-steps/` | https://biiwow-spanish-steps.pages.dev |

## Build

All "Steps" apps (English, Serbian, Hungarian, Spanish) share one code base in `steps-core/`; each app folder holds a `config.json` (language, levels, names), its `packs/` and the built `site/`.

- Steps app: `node steps-core/build.js <app-folder>` (e.g. `node steps-core/build.js english-steps`) → `<app>/site/`.
- Nine Scripts: `cd nine-scripts && node build.js && node build-cf.js` → `index.html` (claude.ai preview) and `site/`.

The built `site/` folders are committed; the workflow deploys them as they are.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which uploads each `site/` folder with wrangler to its Cloudflare Pages project. The repository secret `CLOUDFLARE_API_TOKEN` must hold a token with "Cloudflare Pages: Edit".
