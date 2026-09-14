import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/types";

export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartState {
  groupId: string | null;
  groupName: string | null;
  lines: CartLine[];
  setGroup: (id: string, name: string) => void;
  clearGroup: () => void;
  setQuantity: (product: Product, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      groupId: null,
      groupName: null,
      lines: [],
      setGroup: (id, name) =>
        set((s) => ({
          groupId: id,
          groupName: name,
          // switching group discards the previous group's cart
          lines: s.groupId === id ? s.lines : [],
        })),
      clearGroup: () => set({ groupId: null, groupName: null, lines: [] }),
      setQuantity: (product, quantity) =>
        set((s) => {
          const others = s.lines.filter((l) => l.product.id !== product.id);
          if (quantity <= 0) return { lines: others };
          return { lines: [...others, { product, quantity }] };
        }),
      remove: (productId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.product.id !== productId) })),
      clear: () => set({ lines: [] }),
    }),
    { name: "craft-cart" },
  ),
);

export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + l.product.points * l.quantity, 0);

export const cartQty = (lines: CartLine[], productId: string) =>
  lines.find((l) => l.product.id === productId)?.quantity ?? 0;

/**
 * Client-side validation engine. Returns an error message if `quantity` of
 * `product` cannot be ordered given remaining availability, else null.
 * The server re-validates in place_order(); this is for immediate feedback.
 */
export function validateQuantity(
  product: Product,
  quantity: number,
  avail: { global_remaining: number | null; group_remaining: number | null } | undefined,
): string | null {
  if (!avail) return null;
  if (avail.global_remaining !== null && quantity > avail.global_remaining) {
    return avail.global_remaining <= 0
      ? `${product.name} is out of stock`
      : `Only ${avail.global_remaining} ${product.name} left in stock`;
  }
  if (avail.group_remaining !== null && quantity > avail.group_remaining) {
    return avail.group_remaining <= 0
      ? `Your group has already reached the limit for ${product.name}`
      : `Your group can only order ${avail.group_remaining} more ${product.name}`;
  }
  return null;
}
