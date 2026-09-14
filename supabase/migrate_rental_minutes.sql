-- Adds an editable rental duration (minutes) to products. Run once in the Supabase SQL editor.
alter table public.order_products
  add column if not exists rental_minutes integer not null default 5 check (rental_minutes > 0);
