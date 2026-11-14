# biiwow Plate

A private, mobile-first planner and tracker for what you eat and drink. It answers one question: **given what I've already had and what I'm planning for later, what should I add, swap or resize to get closer to my targets?**

Next.js 15 (App Router, TypeScript) · Supabase Auth + Postgres with row-level security · rules-based recommendation engine · biiwow layout and type with its own green / blue palette (green for food and actions, blue for plans and drinks).

## What it does

- **Today** (the default screen) shows three numbers everywhere: **Consumed** (what you actually had), **Still planned**, and **Projected** (consumed + planned). The headline gives the room left after your plan, or how far over the plan is projected to go.
- **Add food or drink** is the primary action. Recent items, favourites, foods at home and saved meals appear as soon as you tap it. Search covers your foods and the bundled catalog instantly, then USDA FoodData Central and Open Food Facts. You can also create a custom entry, enter values from a label, or look up a barcode.
- **Planned → had in one tap.** "Had a different amount" keeps the original plan for comparison. If you had less, you can keep the rest planned (it becomes its own planned item) or skip it. Each entry is in exactly one state (planned, consumed or skipped), so nothing is ever counted twice.
- **Drinks** go in the same diary and have their own summary: volume, water, calories, sugar, caffeine and alcohol. Extras such as milk or syrup attach to a drink and count once in the daily totals.
- **Nutrients:** calories, protein, carbs, fat, saturated fat, fiber, sugar and sodium, plus vitamins and minerals where data exists. Tap any total to see which foods contributed most. **Missing values are unknown, never zero**: affected totals are marked *incomplete*, and the detail view names the items.
- **Week** shows seven days against the targets that applied on each day, and flags recurring gaps, noting when incomplete data affects the pattern.
- **Suggestions** (up to three) are worked out from the food data: add a specific food and portion to fill a gap, swap or resize a planned item, add water, or swap a drink when you're near a limit. Each one shows before → after projected totals and any trade-offs. **Preview** changes the numbers on screen without saving. **Apply to plan** changes planned items only; consumed entries stay as recorded. When nothing is worthwhile, or the data is too incomplete, it says so.
- **Settings:** a calorie target, plus optional nutrient minimums and limits (sugar, sodium, caffeine, alcohol…) and a fluid target counting all drinks or water only. Targets are saved with an **effective date**, so earlier days keep the targets you had then. You can choose which totals appear on Today, and set diet, allergies, avoided ingredients and liked foods. Your diary exports to **CSV**, and **Delete my data** removes everything (optionally your login too).
- **Foods:** favourites, foods at home, your custom/label foods, saved meals (a reusable group of items) and homemade **recipes** with a yield (total cooked weight or servings). You then log how much of a recipe you ate.

### Food data

| Source | Used for | Notes |
|---|---|---|
| Bundled catalog (`data/catalog.json`, 95 items) | Generic foods and drinks, instant search, suggestion candidates | Values per 100 g / 100 ml following USDA FoodData Central (SR Legacy). Raw, cooked and dry forms are separate items. Portions are USDA household measures or exact volume conversions only. Nutrients not known with confidence are left out (unknown). Dietary fiber is set to 0 only where it is zero by definition (animal products, oils, water, coffee, tea). **The values were compiled offline; spot-check against fdc.nal.usda.gov before relying on them** (see "Catalog accuracy" below). |
| USDA FoodData Central API | Live search of generic and branded foods | Server-side only, needs `FDC_API_KEY`. Portions come from FDC gram weights; density for drinks is derived from a "1 cup" measure where one exists. |
| Open Food Facts | Packaged products (search and barcode) | Unit-converted (OFF stores values in grams; alcohol is % vol → g per 100 ml). Missing vitamins stay unknown. |
| Manual / label entry | Local products | Enter per 100 g/ml or per serving with the serving size. Blank fields stay unknown. |

Every diary entry stores a **snapshot** of the nutrient values it was logged with, so history never changes if a source listing changes later. External results you log are saved to your foods with their source reference.

## How it's built

```
plate/
  data/catalog.json              bundled generic foods (source of the catalog migration)
  supabase/migrations/           schema + RLS, and the generated catalog insert
  supabase/config.toml           local stack; public sign-up disabled
  scripts/invite.ts              create the single invited account
  scripts/seed-demo.ts           separate demo dataset (demo account + a week of data)
  scripts/build-catalog-migration.ts
  src/lib/day.ts                 consumed / planned / projected, incomplete tracking, targets by date
  src/lib/entries.ts             entry creation and the had / different amount / skip transitions
  src/lib/recommend.ts           rules-based recommendation engine (pure, unit-tested)
  src/lib/sources/{usda,off}.ts  USDA and Open Food Facts mappers (+ offline fixtures in mock.ts)
  src/lib/data.ts                client data access (always as the signed-in user)
  src/app/api/...                server routes: food search, barcode, CSV export, delete data
  src/components/, src/app/      UI
  tests/unit/                    Vitest
  tests/e2e/                     Playwright, against a real local Supabase
```

**Security**

- Every user table has `user_id` and an RLS policy `user_id = auth.uid()` for all operations. The anonymous role has no table grants. The catalog is read-only to signed-in users. Triggers check that links between rows (drink extras, partial-plan remainders, recipe items) stay within one user's data.
- Public sign-up is disabled. The one account is created by invite (`npm run invite`).
- The browser only ever gets the public anon/publishable key. `SUPABASE_SERVICE_ROLE_KEY` and `FDC_API_KEY` are read only in server code (`src/lib/supabase/server.ts` is marked `server-only`). The service role key is used only for invites, the demo seed, and deleting your login on request.
- Middleware refreshes the session and redirects anything not signed in to `/login`. API routes return 401.

## Setup

Requirements: Node 20+, Docker (for the local Supabase stack), npm.

```bash
cd plate
npm install
npm run db:start            # local Supabase (Postgres, Auth, REST, Mailpit); applies migrations
npx supabase status -o env  # shows ANON_KEY and SERVICE_ROLE_KEY
cp .env.example .env.local  # paste the keys; add FDC_API_KEY if you have one
npm run invite -- you@example.com --password 'a long password'
npm run dev                 # http://localhost:3000
```

Optional demo data, kept separate from the migrations: `npm run demo:seed` creates `demo@example.com` / `demo-plate-2026` with six days of history, a plan for today, targets, foods at home and a recipe. Use `--email` and `--password` to change them.

### Credentials

| Variable | Where | What |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Public anon / publishable key (safe to expose; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Invites, demo seed, deleting your login |
| `FDC_API_KEY` | **server only** | Free key: https://fdc.nal.usda.gov/api-key-signup.html. Without it, USDA live search is off and everything else works. |
| `NEXT_PUBLIC_SITE_URL` | server/scripts | Base URL for invite and magic-link emails |
| `FOOD_SOURCES_MOCK` | server | `1` serves USDA/OFF from bundled fixtures (tests, offline demos). Use `0` in production. |

## Tests

```bash
npm run typecheck
npm test                    # unit: day math, logging transitions, recommendations, USDA/OFF mapping, CSV
npm run build
npm run test:e2e            # Playwright against the local Supabase stack (npm run db:start first)
```

The e2e suite starts `next start` on port 3100 with `FOOD_SOURCES_MOCK=1` and creates two test accounts. It runs the six acceptance flows end to end:

1. Set a calorie target, plan a meal and a drink → both appear in Still planned and Projected (Consumed stays 0), and the fluid total includes the drink.
2. Plan 300 g, log 200 g with the rest kept planned → Consumed 200 g, Planned 100 g, Projected unchanged; the database shows `planned_amount` 300 kept on the logged row. Logging the rest gives 300 g consumed and 0 planned.
3. Exceed the target with a planned juice → a swap suggestion appears. Preview shows new totals and writes nothing to the database. Apply replaces only the planned drink; the consumed entry is unchanged in the database.
4. Room for calories but a protein gap → the suggestion names a portion within the food's realistic serving cap and fits the remaining calories. The preview's protein delta matches the stated amount, and after Apply the dashboard shows the previewed total.
5. A packaged product (barcode, through the real Open Food Facts mapper) has no vitamin data → the vitamin C total is marked incomplete and the detail names the product. Protein stays complete. The CSV leaves the value blank.
6. A second device (separate browser context) sees the same diary, and a change made on it shows on the first. A second account sees nothing in the UI or the CSV. With that account's token it can't select, update, delete or insert another user's rows (RLS), and the anonymous role reads nothing.

## Deployment

### Cloudflare Pages (how biiwow Plate is published)

Because Supabase handles login and data from the browser (row-level security still protects every row), the app is built as a static site (`npm run build:pages` → `pages-out/`). Food search and barcode lookup run as Cloudflare Pages Functions (`functions/api/foods/*`) so the USDA key stays private; they answer signed-in users only, checking the Supabase session.

1. **Supabase:** create a project. Run `supabase/migrations/20261114000001_schema.sql`, then `…000002_catalog.sql`, in the SQL Editor (or `npx supabase db push`). Then in Authentication:
   - turn off "Allow new users to sign up";
   - set the Site URL to `https://biiwow-plate.pages.dev`, and add `https://biiwow-plate.pages.dev/**` to Redirect URLs;
   - create your account under Users → Add user.
2. **Cloudflare Pages project `biiwow-plate`:** set these variables for the functions: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and optionally the secret `FDC_API_KEY` for USDA search.
3. **Build and deploy:** `.github/workflows/plate.yml` builds with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both public) and deploys `pages-out/` with the functions, using the repository's `CLOUDFLARE_API_TOKEN` secret.

On this build there is no server-side service role key, so "delete my login" is not offered; Delete my data still removes every row. Remove the login itself in Supabase → Authentication → Users.

### Demo

`npm run build:demo` → `demo-out/`: no login and no Supabase; data stays in the visitor's browser and starts with a sample week. `.github/workflows/plate-demo.yml` publishes it to https://biiwow-plate-demo.pages.dev.

### Node hosting (optional)

`npm run build && npm start` runs the full Next.js server (middleware, API routes, CSV export on the server, deleting your login with `SUPABASE_SERVICE_ROLE_KEY`). It deploys to Vercel or any Node host; set the variables from the Credentials table with `FOOD_SOURCES_MOCK=0`.

## Catalog accuracy

`data/catalog.json` was compiled without network access, from USDA SR Legacy values as recalled. The FDC IDs are included only where they were certain. Check these first against FoodData Central: tuna in water, white and whole-wheat bread, kale and cheddar (USDA has older and newer versions of these entries), plus lemonade, sports drink, alcohol-free beer, cola caffeine, decaf coffee caffeine and the vitamin D in cooked salmon. The oat drink uses typical label values (it has no SR Legacy entry) and is marked as label data. After editing the JSON, run `npm run db:catalog` and apply the regenerated migration. Logged entries keep their original values.
