"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderItem, OrderStatus, Product } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Shell,
  TableWrap,
  statusTone,
} from "@/components/Shell";
import { ProductImage } from "@/components/ProductImage";

type ItemRow = OrderItem & {
  order_products: Pick<
    Product,
    "name" | "is_rental" | "rental_minutes" | "image_url"
  > | null;
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<
    (Order & { order_groups: { name: string } | null }) | null
  >(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [o, i] = await Promise.all([
      supabase
        .from("order_orders")
        .select("*, order_groups(name)")
        .eq("id", id)
        .single(),
      supabase
        .from("order_order_items")
        .select("*, order_products(name, is_rental, rental_minutes, image_url)")
        .eq("order_id", id),
    ]);
    if (o.error) return setError(o.error.message);
    if (i.error) return setError(i.error.message);
    setOrder(o.data);
    setItems(i.data ?? []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (status: OrderStatus) => {
    const { error } = await createClient()
      .from("order_orders")
      .update({ status })
      .eq("id", id);
    if (error) setError(error.message);
    else load();
  };

  return (
    <Shell
      title="Order details"
      right={
        <Link href="/seller" className="hover:underline">
          ← All orders
        </Link>
      }
    >
      <ErrorText>{error}</ErrorText>
      {!order ? (
        !error && <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <Card>
            <TableWrap>
              <table className="w-full min-w-[320px] text-sm">
                <thead className="text-left text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="pb-2">Item</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr
                      key={it.id}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <ProductImage
                            src={it.order_products?.image_url}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded"
                          />
                          <span>
                            {it.order_products?.name ?? "Unknown"}{" "}
                            {it.order_products?.is_rental && (
                              <Badge tone="warn">
                                Rent {it.order_products.rental_minutes} min
                              </Badge>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 text-right">{it.quantity}</td>
                      <td className="py-2 text-right">
                        {it.quantity * it.point_price}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-200 font-semibold dark:border-zinc-700">
                    <td className="pt-2">Total</td>
                    <td />
                    <td className="pt-2 text-right">
                      {order.total_points} pts
                    </td>
                  </tr>
                </tfoot>
              </table>
            </TableWrap>
          </Card>

          <Card className="h-fit space-y-3">
            <p className="text-lg font-semibold">
              {order.order_groups?.name ?? "Unknown group"}
            </p>
            <p className="font-mono text-xs text-zinc-400">#{order.id}</p>
            <p className="text-xs text-zinc-500">
              {new Date(order.created_at).toLocaleString()}
            </p>
            <div>
              <Badge tone={statusTone(order.status)}>{cap(order.status)}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {ORDER_STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={s === order.status ? "primary" : "secondary"}
                  disabled={s === order.status}
                  onClick={() => setStatus(s)}
                >
                  Mark as {cap(s)}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Shell>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
