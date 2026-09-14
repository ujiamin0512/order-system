"use client";

import { useState } from "react";
import { useMarket } from "@/lib/useMarket";
import { cartQty, useCart, validateQuantity } from "@/store/cart";
import type { Product } from "@/lib/types";
import { Badge, Button, Card, ErrorText, Shell } from "@/components/Shell";
import { BuyerHeaderRight } from "@/components/BuyerHeader";
import { ProductImage } from "@/components/ProductImage";

export default function MarketPage() {
  const { products, availability, loading, error } = useMarket();
  const { lines, setQuantity } = useCart();
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const change = (product: Product, delta: number) => {
    const next = cartQty(lines, product.id) + delta;
    const err = validateQuantity(product, next, availability[product.id]);
    setItemErrors((e) => ({ ...e, [product.id]: err ?? "" }));
    if (err) return;
    setQuantity(product, next);
  };

  return (
    <Shell title="Market" right={<BuyerHeaderRight />}>
      <ErrorText>{error}</ErrorText>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading products…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const avail = availability[p.id];
            const qty = cartQty(lines, p.id);
            const soldOut = avail?.global_remaining !== null && avail?.global_remaining !== undefined && avail.global_remaining <= 0;
            const groupMaxed = avail?.group_remaining !== null && avail?.group_remaining !== undefined && avail.group_remaining <= 0;
            const blocked = soldOut || groupMaxed;
            return (
              <Card key={p.id} className="flex flex-col gap-3">
                <ProductImage src={p.image_url} alt={p.name} className="aspect-[4/3] w-full rounded-md" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{p.name}</h3>
                    <p className="text-lg font-semibold">{p.points} pts</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.is_rental && <Badge tone="warn">Rent for {p.rental_minutes} minutes</Badge>}
                    {p.max_per_group !== null && (
                      <Badge>Max {p.max_per_group} per group</Badge>
                    )}
                    {p.global_inventory !== null && (
                      <Badge tone={soldOut ? "bad" : "neutral"}>
                        {soldOut
                          ? "Out of stock"
                          : `${avail?.global_remaining ?? p.global_inventory} left`}
                      </Badge>
                    )}
                    {groupMaxed && !soldOut && <Badge tone="bad">Group limit reached</Badge>}
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between">
                  {qty === 0 ? (
                    <Button onClick={() => change(p, 1)} disabled={blocked}>
                      Add to cart
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => change(p, -1)} aria-label="Decrease">
                        −
                      </Button>
                      <span className="w-8 text-center font-medium">{qty}</span>
                      <Button variant="secondary" onClick={() => change(p, 1)} aria-label="Increase">
                        +
                      </Button>
                    </div>
                  )}
                  {qty > 0 && (
                    <span className="text-sm text-zinc-500">{qty * p.points} pts</span>
                  )}
                </div>
                <ErrorText>{itemErrors[p.id]}</ErrorText>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
