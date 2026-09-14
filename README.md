# Craft Market — point-based ordering system

Next.js (App Router) + Tailwind + Zustand + Supabase. Spec: [order-system.md](order-system.md).

## Setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run [supabase/schema.sql](supabase/schema.sql) (tables, RLS, RPCs, realtime, seed products). If you ran an older version of the schema before the tables were prefixed, run [supabase/migrate_rename.sql](supabase/migrate_rename.sql) first, then `schema.sql` again.
3. Create the admin user: **Authentication → Users → Add user** (email + password, auto-confirm), then run:
   ```sql
   update public.order_profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
4. Fill in `.env` with your project URL and anon/publishable key (**Project Settings → API**).
5. `npm install` then `npm run dev`.

## Routes

| Route | Who | Notes |
| --- | --- | --- |
| `/` | Buyer | Pick a group from the dropdown (no login). |
| `/market`, `/cart` | Buyer | Browse, add to cart, checkout. Cart persists in localStorage per browser. |
| `/seller`, `/seller/[id]` | Seller | Public, no login. Live order feed grouped by group; update status. |
| `/admin/login` | Admin | Email + password (Supabase Auth). |
| `/admin`, `/admin/groups`, `/admin/products` | Admin | Analytics, bulk group creation, product CRUD. Guarded by `src/proxy.ts`. |

## Business rules (as implemented)

- Points are a running total only — groups have no balance to deduct from.
- `max_per_group` is a **lifetime** limit across all of a group's orders.
- `global_inventory`: non-rental units are consumed forever; rental units return to stock when the seller marks the order **Completed**.
- Validation runs client-side for instant feedback and again server-side inside the `place_order()` RPC (atomic, with a lock so two groups can't both take the last unit).
- Sellers have no login, so anyone with the URL can change order status; a DB trigger prevents changing anything other than `status` without an admin session.
