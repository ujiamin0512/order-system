"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/store/cart";
import type { Availability, Product } from "@/lib/types";

/** Loads products and this group's availability; redirects to / if no group chosen. */
export function useMarket() {
  const router = useRouter();
  const groupId = useCart((s) => s.groupId);
  const [hydrated, setHydrated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // zustand persist rehydrates after first render
  useEffect(() => {
    const unsub = useCart.persist.onFinishHydration(() => setHydrated(true));
    if (useCart.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    const supabase = createClient();
    const [p, a] = await Promise.all([
      supabase.from("order_products").select("*").order("points").order("name"),
      supabase.rpc("get_availability", { p_group_id: groupId }),
    ]);
    if (p.error) setError(p.error.message);
    else if (a.error) setError(a.error.message);
    else {
      setError(null);
      setProducts(p.data ?? []);
      const map: Record<string, Availability> = {};
      for (const row of (a.data ?? []) as Availability[]) map[row.product_id] = row;
      setAvailability(map);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!groupId) {
      router.replace("/");
      return;
    }
    refresh();
  }, [hydrated, groupId, refresh, router]);

  return { products, availability, loading: loading || !hydrated, error, refresh };
}
