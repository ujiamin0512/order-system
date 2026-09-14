-- Allows decimal points balances (e.g. 12.5). Data is preserved. Run once in the Supabase SQL editor.

drop view if exists public.order_group_spend;

alter table public.order_groups
  alter column points_balance type numeric(12,2) using points_balance::numeric;

create view public.order_group_spend with (security_invoker = true) as
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
