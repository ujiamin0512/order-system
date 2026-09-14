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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const deleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} order${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    const { error } = await createClient().from("order_orders").delete().in("id", ids);
    if (error) setError(error.message);
    else setSelected(new Set());
    setDeleting(false);
    load();
  };

  const visible =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const allVisibleSelected = visible.length > 0 && visible.every((o) => selected.has(o.id));
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
      {visible.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(e) =>
                setSelected(e.target.checked ? new Set(visible.map((o) => o.id)) : new Set())
              }
            />
            Select all shown
          </label>
          <Button
            variant="danger"
            onClick={deleteSelected}
            disabled={selected.size === 0 || deleting}
          >
            {deleting ? "Deleting…" : `Delete selected (${selected.size})`}
          </Button>
        </div>
      )}
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
                    className={`flex flex-wrap items-center justify-between gap-3 ${
                      selected.has(o.id) ? "ring-2 ring-red-400" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      aria-label="Select order"
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                      className="h-4 w-4"
                    />
                    <Link
                      href={`/seller/${o.id}`}
                      className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 hover:underline"
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
