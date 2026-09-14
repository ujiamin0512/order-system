-- Adds a points balance per group (admin-editable) and remaining = balance - spent.
-- Additive only: existing groups get balance 0. Run once in the Supabase SQL editor.

alter table public.order_groups
  add column if not exists points_balance integer not null default 0 check (points_balance >= 0);

create or replace view public.order_group_spend with (security_invoker = true) as
  select g.id as group_id, g.name as group_name,
         coalesce(sum(o.total_points), 0)::int as points_spent,
         count(o.id)::int as order_count,
         count(o.id) filter (where o.status <> 'completed')::int as active_orders,
         g.points_balance,
         (g.points_balance - coalesce(sum(o.total_points), 0))::int as points_remaining
  from public.order_groups g
  left join public.order_orders o on o.group_id = g.id
  group by g.id, g.name, g.points_balance
  order by g.name;
