# Project Overview
Create a point-based ordering and inventory management system for crafting supplies. The system supports three user roles: Admin, Seller, and Buyer (Group). Buyers use allocated points (acting as currency) to add items to a cart and place orders. 

# Tech Stack
- **Frontend:** TypeScript, React (Next.js App Router preferred), Tailwind CSS
- **Backend/Database:** Supabase (PostgreSQL, Supabase Auth)
- **State Management:** React Context or Zustand (for shopping cart)

# User Roles & Features

## 1. Admin
- **Group Management:** Can bulk create user groups (e.g., Group 1, Group 2, Group 3) which populates a dropdown on the login/entry page.
- **Product Management:** Full CRUD operations for market products (add, edit, delete, update points, set inventory limits, set per-group limits).
- **Analytics:** View total accumulated points spent across all groups and active orders.

## 2. Buyer (User/Group)
- **Entry:** Selects their assigned Group from a dropdown list to access the Market Page.
- **Market Page:** Browses available products. Products display point values and any rental/limit conditions.
- **Shopping Cart (CRUD before order):** 
  - Add/remove items and adjust quantities.
  - System automatically calculates the sum of points.
  - **Validation Engine:** Must block checkout or adding to cart if group limits or global inventory limits are exceeded.
- **Checkout:** Submits the order to the sellers.

## 3. Seller (Receiver)
- **Order Dashboard:** Views a real-time feed of incoming orders grouped by Group ID.
- **Order Details:** Can click into an order to view the exact items requested and total points spent.
- **Status Updates:** Can mark orders as "Received", "Processing", or "Completed".

# Product Catalog & Business Logic
Initialize the database with the following default products. The admin must be able to change these later.

| Product Name | Point Value | Rules / Constraints |
| :--- | :--- | :--- |
| Bottle cap | 5 points | No limit |
| Rubber band | 5 points | No limit |
| Straw | 5 points | No limit |
| Ice cream stick (wood) | 5 points | No limit |
| Ice cream stick (colourful) | 10 points | No limit |
| Decoration | 10 points | No limit |
| Scissors | 10 points | Tag as "Rent for 5 minutes" |
| Uhu Glue | 15 points | **Max 1 per group** |
| Hot glue gun | 15 points | Tag as "Rent for 5 minutes". **Global inventory max: 3** |
| Flag | 20 points | **Max 1 per group** |

# Database Schema Architecture (Supabase)
Please provide the Supabase SQL schema to create the following tables with Row Level Security (RLS) policies:
1. `profiles`: id (auth.uid), role (admin, seller, buyer)
2. `groups`: id, name, created_at
3. `products`: id, name, points, is_rental, max_per_group, global_inventory, created_at
4. `orders`: id, group_id, status, total_points, created_at
5. `order_items`: id, order_id, product_id, quantity, point_price

# Implementation Steps to Execute
1. Generate the Supabase SQL schema and initial seed data for the products and roles.
2. Build the authentication and entry flow (Group selection for buyers, Admin/Seller login).
3. Develop the Admin dashboard (Group bulk creation, Product CRUD).
4. Build the Buyer Market page, Cart state management, and Checkout validation logic.
5. Build the Seller Order Management dashboard.