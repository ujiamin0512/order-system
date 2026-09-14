"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Group, Order, OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Shell,
  statusTone,
} from "@/components/Shell";

export default function SellerPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [groups, setGroups] = useState<Record<string, Group>>({});
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [o, g] = await Promise.all([
      supabase
        .from("order_orders")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("order_groups").select("*"),
    ]);
    if (o.error) return setError(o.error.message);
    if (g.error) return setError(g.error.message);
    setOrders(o.data ?? []);
    setGroups(Object.fromEntries((g.data ?? []).map((x: Group) => [x.id, x])));
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("orders-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_orders" },
        () => load(),
      )
      .subscribe((status: string) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const setStatus = async (id: string, status: OrderStatus) => {
    const { error } = await createClient()
      .from("order_orders")
      .update({ status })
      .eq("id", id);
    if (error) setError(error.message);
    else load();
  };

  const visible =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const byGroup = new Map<string, Order[]>();
  for (const o of visible)
    byGroup.set(o.group_id, [...(byGroup.get(o.group_id) ?? []), o]);
  const groupIds = [...byGroup.keys()].sort((a, b) =>
    (groups[a]?.name ?? "").localeCompare(groups[b]?.name ?? "", undefined, {
      numeric: true,
    }),
  );

  return (
    <Shell
      title="Seller dashboard"
      right={
        <Badge tone={live ? "good" : "warn"}>
          {live ? "Live" : "Connecting…"}
        </Badge>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? "primary" : "secondary"}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : cap(s)}{" "}
            <span className="ml-1 opacity-60">
              {s === "all"
                ? orders.length
                : orders.filter((o) => o.status === s).length}
            </span>
          </Button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>

      {groupIds.length === 0 ? (
        <p className="text-sm text-zinc-500">No orders yet.</p>
      ) : (
        <div className="space-y-6">
          {groupIds.map((gid) => (
            <section key={gid}>
              <h2 className="mb-2 text-lg font-semibold">
                {groups[gid]?.name ?? "Unknown group"}
              </h2>
              <div className="space-y-2">
                {byGroup.get(gid)!.map((o) => (
                  <Card
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <Link
                      href={`/seller/${o.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 hover:underline"
                    >
                      <span className="font-mono text-xs text-zinc-400">
                        #{o.id.slice(0, 8)}
                      </span>
                      <span className="font-medium">{o.total_points} pts</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(o.created_at).toLocaleTimeString()}
                      </span>
                    </Link>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                      <Badge tone={statusTone(o.status)}>{cap(o.status)}</Badge>
                      {ORDER_STATUSES.filter((s) => s !== o.status).map((s) => (
                        <Button
                          key={s}
                          variant="secondary"
                          onClick={() => setStatus(o.id, s)}
                        >
                          {cap(s)}
                        </Button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
