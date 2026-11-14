-- biiwow Plate: schema, row-level security and helper functions.
-- Every user-owned table carries user_id and is locked to auth.uid() by RLS.
-- Nutrient values are stored as jsonb maps {nutrient_key: number} per 100 g, per 100 ml
-- or per 1 serving (see "basis"). A missing key means "unknown", never zero.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  dashboard_nutrients text[] not null default array['protein_g','fiber_g','fluid_ml'],
  diet text[] not null default '{}',          -- e.g. vegetarian, vegan, pescatarian
  allergies text[] not null default '{}',     -- allergen codes, e.g. peanuts, milk
  avoid_ingredients text[] not null default '{}', -- free text, matched against names and ingredients
  liked_foods text[] not null default '{}',   -- free text preferences used to rank suggestions
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- targets
-- A new row per change; the targets in force on a date are the row with the
-- latest effective_date <= that date. Earlier days keep their own targets.
create table public.targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  effective_date date not null,
  calories numeric not null check (calories > 0 and calories < 20000),
  -- {nutrient_key: {"min": n, "max": n}}; protein_g, fiber_g, sodium_mg, vitamin_c_mg, ...
  nutrients jsonb not null default '{}'::jsonb,
  fluid_ml numeric check (fluid_ml is null or fluid_ml >= 0),
  fluid_mode text not null default 'all_drinks' check (fluid_mode in ('all_drinks','water_only')),
  created_at timestamptz not null default now(),
  unique (user_id, effective_date)
);
create index targets_user_date on public.targets (user_id, effective_date desc);

-- ---------------------------------------------------------------- shared catalog (read-only to users)
create table public.catalog_foods (
  id text primary key,
  name text not null,
  brand text,
  kind text not null check (kind in ('food','drink')),
  state text check (state in ('raw','cooked','prepared','dry')),
  basis text not null check (basis in ('g','ml')),
  density numeric,
  source text not null default 'usda',
  source_ref text,
  nutrients jsonb not null,
  portions jsonb not null default '[]'::jsonb,
  default_amount numeric not null,
  max_amount numeric not null,
  tags text[] not null default '{}',
  allergens text[] not null default '{}'
);
create index catalog_foods_name_trgm on public.catalog_foods using gin (name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------- user foods
-- Custom foods, label entries, and copies of USDA / Open Food Facts / catalog
-- items the user has used, favourited or keeps at home.
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  brand text,
  kind text not null default 'food' check (kind in ('food','drink')),
  state text check (state in ('raw','cooked','prepared','dry')),
  basis text not null default 'g' check (basis in ('g','ml','serving')),
  density numeric,
  source text not null default 'custom' check (source in ('custom','label','usda','off','catalog','recipe')),
  source_id text,
  source_ref text,
  barcode text,
  ingredients text,
  nutrients jsonb not null default '{}'::jsonb,
  portions jsonb not null default '[]'::jsonb,
  default_amount numeric,
  max_amount numeric,
  tags text[] not null default '{}',
  allergens text[] not null default '{}',
  is_favorite boolean not null default false,
  at_home boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);
create index foods_user on public.foods (user_id);

-- ---------------------------------------------------------------- saved meals and recipes
-- kind 'group': a reusable set of ingredients added as separate entries.
-- kind 'recipe': a homemade dish; ingredients are summed and divided by the yield.
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  kind text not null check (kind in ('group','recipe')),
  yield_amount numeric check (yield_amount is null or yield_amount > 0),
  yield_unit text check (yield_unit in ('g','serving')),
  default_meal text check (default_meal in ('breakfast','lunch','dinner','snacks','drinks')),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_id uuid not null references public.meals (id) on delete cascade,
  position int not null default 0,
  food_id uuid references public.foods (id) on delete set null,
  name text not null,
  brand text,
  kind text not null default 'food' check (kind in ('food','drink')),
  state text,
  basis text not null check (basis in ('g','ml','serving')),
  density numeric,
  nutrients jsonb not null,
  amount numeric not null check (amount > 0),
  unit text not null check (unit in ('g','ml','serving')),
  portion_label text,
  tags text[] not null default '{}',
  allergens text[] not null default '{}'
);
create index meal_items_meal on public.meal_items (meal_id);

-- ---------------------------------------------------------------- diary
-- Each entry stores a snapshot of the food's nutrients, so later changes to a
-- source listing never alter history. An entry is in exactly one status:
-- planned (still to come), consumed (actually had) or skipped (not counted).
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  meal text not null check (meal in ('breakfast','lunch','dinner','snacks','drinks')),
  status text not null default 'planned' check (status in ('planned','consumed','skipped')),
  position int not null default 0,
  food_id uuid references public.foods (id) on delete set null,
  catalog_id text,
  meal_id uuid references public.meals (id) on delete set null,
  name text not null,
  brand text,
  kind text not null default 'food' check (kind in ('food','drink')),
  state text,
  source text,
  source_ref text,
  basis text not null check (basis in ('g','ml','serving')),
  density numeric,
  nutrients jsonb not null,
  tags text[] not null default '{}',
  allergens text[] not null default '{}',
  amount numeric not null check (amount > 0),
  unit text not null check (unit in ('g','ml','serving')),
  portion_label text,
  portion_count numeric,
  planned_amount numeric,                 -- the amount originally planned, kept for comparison
  split_from uuid references public.diary_entries (id) on delete set null, -- remainder of a partly-eaten plan
  parent_id uuid references public.diary_entries (id) on delete cascade,   -- drink extras (milk, syrup) belong to a drink
  swapped_from text,                      -- name of the planned item this replaced, when a suggestion was applied
  note text,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index diary_user_date on public.diary_entries (user_id, entry_date);
create index diary_user_created on public.diary_entries (user_id, created_at desc);

-- ---------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger foods_touch before update on public.foods for each row execute function public.touch_updated_at();
create trigger meals_touch before update on public.meals for each row execute function public.touch_updated_at();
create trigger diary_touch before update on public.diary_entries for each row execute function public.touch_updated_at();

-- A meal item must belong to a meal owned by the same user.
create or replace function public.meal_item_owner_check() returns trigger
language plpgsql security invoker as $$
begin
  if not exists (select 1 from public.meals m where m.id = new.meal_id and m.user_id = new.user_id) then
    raise exception 'meal does not belong to user';
  end if;
  return new;
end $$;
create trigger meal_items_owner before insert or update on public.meal_items
  for each row execute function public.meal_item_owner_check();

-- Linked diary entries (parent / split) must belong to the same user.
create or replace function public.diary_link_check() returns trigger
language plpgsql security invoker as $$
begin
  if new.parent_id is not null and not exists
     (select 1 from public.diary_entries d where d.id = new.parent_id and d.user_id = new.user_id) then
    raise exception 'parent entry does not belong to user';
  end if;
  if new.split_from is not null and not exists
     (select 1 from public.diary_entries d where d.id = new.split_from and d.user_id = new.user_id) then
    raise exception 'split entry does not belong to user';
  end if;
  return new;
end $$;
create trigger diary_links before insert or update on public.diary_entries
  for each row execute function public.diary_link_check();

-- New auth users get a profile row.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.targets enable row level security;
alter table public.catalog_foods enable row level security;
alter table public.foods enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.diary_entries enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own targets" on public.targets for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own foods" on public.foods for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own meals" on public.meals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own meal items" on public.meal_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own diary" on public.diary_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "catalog is readable when signed in" on public.catalog_foods for select to authenticated using (true);

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;
grant select on public.catalog_foods to authenticated;
grant select, insert, update, delete on public.profiles, public.targets, public.foods,
  public.meals, public.meal_items, public.diary_entries to authenticated;

-- ---------------------------------------------------------------- delete my data
-- Removes every row the caller owns. Runs with the caller's rights, so RLS applies.
create or replace function public.delete_my_data() returns void
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.diary_entries where user_id = uid;
  delete from public.meal_items where user_id = uid;
  delete from public.meals where user_id = uid;
  delete from public.foods where user_id = uid;
  delete from public.targets where user_id = uid;
  update public.profiles set dashboard_nutrients = array['protein_g','fiber_g','fluid_ml'], diet = '{}',
    allergies = '{}', avoid_ingredients = '{}', liked_foods = '{}' where user_id = uid;
end $$;
revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
