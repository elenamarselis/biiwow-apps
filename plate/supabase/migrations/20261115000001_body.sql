-- About you: used only to work out personal reference targets (vitamins, minerals,
-- protein, fiber, fluids) and an energy estimate. All optional; RLS on profiles already
-- limits each row to its owner.
alter table public.profiles
  add column if not exists birth_year int check (birth_year is null or birth_year between 1900 and 2100),
  add column if not exists sex text check (sex is null or sex in ('female', 'male')),
  add column if not exists height_cm numeric check (height_cm is null or height_cm between 50 and 260),
  add column if not exists weight_kg numeric check (weight_kg is null or weight_kg between 20 and 400),
  add column if not exists activity text check (activity is null or activity in ('sedentary', 'light', 'moderate', 'active', 'very_active'));
