-- Planning ahead is optional. Off: everything added is logged as eaten (the default).
-- On: items can be planned first and ticked off later (consumed / still planned / projected).
alter table public.profiles add column if not exists planning boolean not null default false;
