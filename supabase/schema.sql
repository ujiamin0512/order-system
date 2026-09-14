-- ============================================================
-- Crafting Supplies Point-Based Ordering System
-- Run this in the Supabase SQL editor on a fresh project.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tables ----------
create table if not exists public.order_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'buyer' check (role in ('admin', 'seller', 'buyer')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  points_balance numeric(12,2) not null default 0 check (points_balance >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points integer not null check (points >= 0),
  is_rental boolean not null default false,
  rental_minutes integer not null default 5 check (rental_minutes > 0),
  max_per_group integer check (max_per_group is null or max_per_group > 0),
  global_inventory integer check (global_inventory is null or global_inventory >= 0),
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_orders (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.order_groups(id) on delete cascade,
  status text not null default 'received' check (status in ('received', 'processing', 'completed')),
  total_points integer not null default 0 check (total_points >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.order_orders(id) on delete cascade,
  product_id uuid not null references public.order_products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  point_price integer not null check (point_price >= 0)
);

create index if not exists order_items_order_id_idx on public.order_order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_order_items(product_id);
create index if not exists orders_group_id_idx on public.order_orders(group_id);

-- ---------- Auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_profiles (id, role) values (new.id, 'buyer')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Helpers ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.order_profiles where id = auth.uid() and role = 'admin');
$$;

-- Per-product availability for a given group.
-- global_remaining: for non-rental items every ordered unit is consumed forever;
--                   for rental items units return to stock when the order is completed.
-- group_remaining:  max_per_group is a lifetime limit across all the group's orders.
create or replace function public.get_availability(p_group_id uuid)
returns table (
  product_id uuid,
  global_remaining integer,
  group_remaining integer
) language sql stable security definer set search_path = public as $$
  select
    p.id,
    case when p.global_inventory is null then null
         else p.global_inventory - coalesce((
           select sum(oi.quantity)::int from public.order_order_items oi
           join public.order_orders o on o.id = oi.order_id
           where oi.product_id = p.id
             and (not p.is_rental or o.status <> 'completed')
         ), 0) end,
    case when p.max_per_group is null then null
         else p.max_per_group - coalesce((
           select sum(oi.quantity)::int from public.order_order_items oi
           join public.order_orders o on o.id = oi.order_id
           where oi.product_id = p.id and o.group_id = p_group_id
         ), 0) end
  from public.order_products p;
$$;

-- Atomic checkout with server-side validation.
-- p_items: [{"product_id": "...", "quantity": 2}, ...]
create or replace function public.place_order(p_group_id uuid, p_items jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_total integer := 0;
  v_item record;
  v_product public.order_products%rowtype;
  v_avail record;
begin
  if not exists (select 1 from public.order_groups where id = p_group_id) then
    raise exception 'Unknown group';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- Serialise checkouts so two groups cannot both grab the last unit.
  perform pg_advisory_xact_lock(hashtext('place_order'));

  for v_item in
    select (e->>'product_id')::uuid as product_id, (e->>'quantity')::int as quantity
    from jsonb_array_elements(p_items) e
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Invalid quantity';
    end if;
    select * into v_product from public.order_products where id = v_item.product_id;
    if not found then
      raise exception 'Unknown product';
    end if;
    select * into v_avail from public.get_availability(p_group_id) a where a.product_id = v_item.product_id;
    if v_avail.global_remaining is not null and v_item.quantity > v_avail.global_remaining then
      raise exception 'Only % of "%" left in stock', greatest(v_avail.global_remaining, 0), v_product.name;
    end if;
    if v_avail.group_remaining is not null and v_item.quantity > v_avail.group_remaining then
      raise exception 'Your group can only order % more of "%"', greatest(v_avail.group_remaining, 0), v_product.name;
    end if;
    v_total := v_total + v_product.points * v_item.quantity;
  end loop;

  insert into public.order_orders (group_id, total_points) values (p_group_id, v_total) returning id into v_order_id;

  insert into public.order_order_items (order_id, product_id, quantity, point_price)
  select v_order_id, (e->>'product_id')::uuid, (e->>'quantity')::int, p.points
  from jsonb_array_elements(p_items) e
  join public.order_products p on p.id = (e->>'product_id')::uuid;

  return v_order_id;
end $$;

-- Admin analytics
create or replace view public.order_group_spend with (security_invoker = true) as
  select g.id as group_id, g.name as group_name,
         coalesce(sum(o.total_points), 0)::int as points_spent,
         count(o.id)::int as order_count,
         count(o.id) filter (where o.status <> 'completed')::int as active_orders,
         g.points_balance,
         (g.points_balance - coalesce(sum(o.total_points), 0))::numeric(12,2) as points_remaining
  from public.order_groups g
  left join public.order_orders o on o.group_id = g.id
  group by g.id, g.name, g.points_balance
  order by g.name;

-- ---------- Row Level Security ----------
alter table public.order_profiles enable row level security;
alter table public.order_groups enable row level security;
alter table public.order_products enable row level security;
alter table public.order_orders enable row level security;
alter table public.order_order_items enable row level security;

drop policy if exists "profiles: own read" on public.order_profiles;
create policy "profiles: own read" on public.order_profiles for select using (id = auth.uid() or public.is_admin());

drop policy if exists "groups: public read" on public.order_groups;
create policy "groups: public read" on public.order_groups for select using (true);
drop policy if exists "groups: admin write" on public.order_groups;
create policy "groups: admin write" on public.order_groups for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products: public read" on public.order_products;
create policy "products: public read" on public.order_products for select using (true);
drop policy if exists "products: admin write" on public.order_products;
create policy "products: admin write" on public.order_products for all using (public.is_admin()) with check (public.is_admin());

-- Buyers create orders only through place_order() (security definer), so there is no insert policy.
-- Sellers have no login, so anyone may update an order, but a trigger restricts them to the status column.
drop policy if exists "orders: public read" on public.order_orders;
create policy "orders: public read" on public.order_orders for select using (true);
drop policy if exists "orders: public status update" on public.order_orders;
create policy "orders: public status update" on public.order_orders for update using (true) with check (true);
-- Sellers (no login) can delete orders from their dashboard; admins reset via the same path.
drop policy if exists "orders: public delete" on public.order_orders;
create policy "orders: public delete" on public.order_orders for delete using (true);

drop policy if exists "order_items: public read" on public.order_order_items;
create policy "order_items: public read" on public.order_order_items for select using (true);

create or replace function public.orders_status_only()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() and (
    new.group_id <> old.group_id or new.total_points <> old.total_points or new.created_at <> old.created_at
  ) then
    raise exception 'Only status may be updated';
  end if;
  return new;
end $$;

drop trigger if exists orders_status_only on public.order_orders;
create trigger orders_status_only before update on public.order_orders
  for each row execute function public.orders_status_only();

-- ---------- Realtime ----------
do $$ begin
  alter publication supabase_realtime add table public.order_orders;
exception when duplicate_object then null; end $$;

-- ---------- Seed products ----------
insert into public.order_products (name, points, is_rental, max_per_group, global_inventory)
select * from (values
  ('Bottle cap', 5, false, null::int, null::int),
  ('Rubber band', 5, false, null, null),
  ('Straw', 5, false, null, null),
  ('Ice cream stick (wood)', 5, false, null, null),
  ('Ice cream stick (colourful)', 10, false, null, null),
  ('Decoration', 10, false, null, null),
  ('Scissors', 10, true, null, null),
  ('Uhu Glue', 15, false, 1, null),
  ('Hot glue gun', 15, true, null, 3),
  ('Flag', 20, false, 1, null)
) as v(name, points, is_rental, max_per_group, global_inventory)
where not exists (select 1 from public.order_products);

-- ---------- Rental minutes ----------
-- Existing projects: run supabase/migrate_rental_minutes.sql.

-- ---------- Product images ----------
-- Run supabase/migrate_images.sql to create the storage bucket and its policies.

-- ---------- Make yourself admin ----------
-- 1. Supabase dashboard -> Authentication -> Users -> "Add user" (email + password).
-- 2. Run (replace the email):
--    update public.order_profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'you@example.com');
