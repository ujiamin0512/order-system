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
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {products.map((p) => {
            const avail = availability[p.id];
            const qty = cartQty(lines, p.id);
            const soldOut = avail?.global_remaining !== null && avail?.global_remaining !== undefined && avail.global_remaining <= 0;
            const groupMaxed = avail?.group_remaining !== null && avail?.group_remaining !== undefined && avail.group_remaining <= 0;
            const blocked = soldOut || groupMaxed;
            return (
              <Card key={p.id} className="flex flex-col gap-2 p-3 sm:p-4">
                <ProductImage src={p.image_url} alt={p.name} className="aspect-square w-full rounded-md sm:aspect-[4/3]" />
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="min-w-0 text-sm font-medium leading-tight sm:text-base">{p.name}</h3>
                  <p className="shrink-0 font-semibold">{p.points} pts</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.is_rental && <Badge tone="warn">Rent for {p.rental_minutes} minutes</Badge>}
                  {p.max_per_group !== null && <Badge>Max {p.max_per_group} per group</Badge>}
                  {p.global_inventory !== null && (
                    <Badge tone={soldOut ? "bad" : "neutral"}>
                      {soldOut ? "Out of stock" : `${avail?.global_remaining ?? p.global_inventory} left`}
                    </Badge>
                  )}
                  {groupMaxed && !soldOut && <Badge tone="bad">Group limit reached</Badge>}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  {qty === 0 ? (
                    <Button className="w-full" onClick={() => change(p, 1)} disabled={blocked}>
                      Add to cart
                    </Button>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <Button variant="secondary" onClick={() => change(p, -1)} aria-label="Decrease">
                          −
                        </Button>
                        <span className="w-7 text-center font-medium">{qty}</span>
                        <Button variant="secondary" onClick={() => change(p, 1)} aria-label="Increase">
                          +
                        </Button>
                      </div>
                      <span className="text-xs text-zinc-500 sm:text-sm">{qty * p.points} pts</span>
                    </>
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
