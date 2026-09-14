export type Role = "admin" | "seller" | "buyer";
export type OrderStatus = "received" | "processing" | "completed";

export const ORDER_STATUSES: OrderStatus[] = ["received", "processing", "completed"];

export interface Group {
  id: string;
  name: string;
  points_balance: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  points: number;
  is_rental: boolean;
  rental_minutes: number;
  max_per_group: number | null;
  global_inventory: number | null;
  image_url: string | null;
  created_at: string;
}

export interface Availability {
  product_id: string;
  global_remaining: number | null;
  group_remaining: number | null;
}

export interface Order {
  id: string;
  group_id: string;
  status: OrderStatus;
  total_points: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  point_price: number;
}

export interface GroupSpend {
  group_id: string;
  group_name: string;
  points_spent: number;
  order_count: number;
  active_orders: number;
  points_balance: number;
  points_remaining: number;
}
