-- Lets the (login-less) seller dashboard delete orders. Run once in the Supabase SQL editor.
drop policy if exists "orders: admin delete" on public.order_orders;
drop policy if exists "orders: public delete" on public.order_orders;
create policy "orders: public delete" on public.order_orders for delete using (true);
