"use client";

import { useState } from "react";
import Link from "next/link";
import { useMarket } from "@/lib/useMarket";
import { createClient } from "@/lib/supabase/client";
import { cartTotal, useCart, validateQuantity } from "@/store/cart";
import { Button, Card, ErrorText, Shell } from "@/components/Shell";
import { BuyerHeaderRight } from "@/components/BuyerHeader";
import { ProductImage } from "@/components/ProductImage";

export default function CartPage() {
  const { availability, loading, error, refresh } = useMarket();
  const { groupId, groupName, lines, setQuantity, remove, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [placedId, setPlacedId] = useState<string | null>(null);

  const total = cartTotal(lines);

  // Validate the whole cart against the latest availability.
  const problems = lines
    .map((l) =>
      validateQuantity(l.product, l.quantity, availability[l.product.id]),
    )
    .filter((m): m is string => !!m);

  const checkout = async () => {
    if (!groupId) return;
    setSubmitting(true);
    setSubmitError(null);
    const { data, error } = await createClient().rpc("place_order", {
      p_group_id: groupId,
      p_items: lines.map((l) => ({
        product_id: l.product.id,
        quantity: l.quantity,
      })),
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      refresh(); // limits may have changed since the cart was built
      return;
    }
    setPlacedId(data as string);
    clear();
    refresh();
  };

  if (placedId) {
    return (
      <Shell title="Cart" right={<BuyerHeaderRight />}>
        <Card className="mx-auto max-w-md space-y-3 text-center">
          <h2 className="text-xl font-semibold">Order placed!</h2>
          <p className="text-sm text-zinc-500">
            {groupName}, your order has been sent to the sellers. Please collect
            your items at the counter.
          </p>
          <p className="font-mono text-xs text-zinc-400">
            #{placedId.slice(0, 8)}
          </p>
          <Link href="/market">
            <Button className="w-full">Back to market</Button>
          </Link>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell title="Cart" right={<BuyerHeaderRight />}>
      <ErrorText>{error}</ErrorText>
      {lines.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-zinc-500">Your cart is empty.</p>
          <Link href="/market" className="mt-3 inline-block">
            <Button variant="secondary">Browse the market</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            {lines
              .slice()
              .sort((a, b) => a.product.name.localeCompare(b.product.name))
              .map((l) => {
                const err = validateQuantity(
                  l.product,
                  l.quantity,
                  availability[l.product.id],
                );
                return (
                  <Card key={l.product.id} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProductImage
                          src={l.product.image_url}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded"
                        />
                        <div>
                          <p className="font-medium">{l.product.name}</p>
                          <p className="text-xs text-zinc-500">
                            {l.product.points} pts each
                          </p>
                        </div>
                      </div>
                      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                        <Button
                          variant="secondary"
                          onClick={() => setQuantity(l.product, l.quantity - 1)}
                          aria-label="Decrease"
                        >
                          −
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {l.quantity}
                        </span>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const next = l.quantity + 1;
                            if (
                              !validateQuantity(
                                l.product,
                                next,
                                availability[l.product.id],
                              )
                            )
                              setQuantity(l.product, next);
                          }}
                          aria-label="Increase"
                        >
                          +
                        </Button>
                        <span className="w-16 text-right font-semibold">
                          {l.product.points * l.quantity} pts
                        </span>
                        <Button
                          variant="ghost"
                          onClick={() => remove(l.product.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <ErrorText>{err}</ErrorText>
                  </Card>
                );
              })}
          </div>

          <Card className="h-fit space-y-3">
            <p className="text-sm text-zinc-500">{groupName}</p>
            <div className="flex items-baseline justify-between">
              <span className="text-sm">Total</span>
              <span className="text-2xl font-bold">{total} pts</span>
            </div>
            <ErrorText>{submitError}</ErrorText>
            {problems.length > 0 && (
              <p className="text-xs text-red-600">
                Fix the items above before checking out.
              </p>
            )}
            <Button
              className="w-full"
              onClick={checkout}
              disabled={submitting || loading || problems.length > 0}
            >
              {submitting ? "Placing order…" : "Checkout"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={clear}>
              Clear cart
            </Button>
          </Card>
        </div>
      )}
    </Shell>
  );
}
