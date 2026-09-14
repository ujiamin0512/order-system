-- Renames tables from an earlier run of schema.sql to the order_* names.
-- Safe to run on either the original (profiles/groups/products/orders/order_items)
-- or the intermediate (order_profiles/order_groups/order_products/orders/order_items) state.
-- After this, re-run schema.sql so functions and the view pick up the new names.

do $$
begin
  if to_regclass('public.profiles') is not null then alter table public.profiles rename to order_profiles; end if;
  if to_regclass('public.groups')   is not null then alter table public.groups   rename to order_groups;   end if;
  if to_regclass('public.products') is not null then alter table public.products rename to order_products; end if;
  if to_regclass('public.order_items') is not null then alter table public.order_items rename to order_order_items; end if;
  if to_regclass('public.orders')   is not null then alter table public.orders   rename to order_orders;   end if;
end $$;

drop view if exists public.group_spend;
