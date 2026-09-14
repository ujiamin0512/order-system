"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupSpend } from "@/lib/types";

const fmt = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");

/** Read-only projector view of group points. Public; live-updates as orders change. */
export default function BoardPage() {
  const [rows, setRows] = useState<GroupSpend[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("order_group_spend")
      .select("*");
    if (error) setError(error.message);
    else {
      setRows((data ?? []) as GroupSpend[]);
      setUpdatedAt(new Date());
    }
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const ch = supabase
      .channel("board")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_groups" }, () => load())
      .subscribe();
    const poll = setInterval(load, 30_000); // safety net if realtime drops
    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [load]);

  const visible = rows.filter((r) => !/^admin/i.test(r.group_name));
  const totalSpent = visible.reduce((n, r) => n + r.points_spent, 0);
  const active = visible.reduce((n, r) => n + r.active_orders, 0);
  const orders = visible.reduce((n, r) => n + r.order_count, 0);

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-white sm:px-12 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Craft Market</h1>
          <p className="text-sm text-zinc-500">
            {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Loading…"}
          </p>
        </div>

        {error && <p className="mb-6 text-lg text-red-400">{error}</p>}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Total points spent" value={fmt(totalSpent)} />
          <Stat label="Active orders" value={String(active)} />
          <Stat label="Total orders" value={String(orders)} />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900">
          <table className="w-full text-[clamp(1rem,2.6vw,2.25rem)]">
            <thead className="text-left text-sm uppercase tracking-wide text-zinc-500 sm:text-base">
              <tr>
                <th className="whitespace-nowrap px-6 py-4">Group</th>
                <th className="whitespace-nowrap px-6 py-4 text-right">Points given</th>
                <th className="whitespace-nowrap px-6 py-4 text-right">Spent</th>
                <th className="whitespace-nowrap px-6 py-4 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const remaining = Number(r.points_remaining);
                return (
                  <tr key={r.group_id} className="border-t border-zinc-800">
                    <td className="whitespace-nowrap px-6 py-5 font-semibold">{r.group_name}</td>
                    <td className="px-6 py-5 text-right text-zinc-300">
                      {fmt(Number(r.points_balance))}
                    </td>
                    <td className="px-6 py-5 text-right text-zinc-300">{fmt(r.points_spent)}</td>
                    <td
                      className={`px-6 py-5 text-right font-bold ${
                        remaining < 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {fmt(remaining)}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && !error && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-xl text-zinc-500">
                    No groups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-5">
      <p className="text-sm uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-[clamp(2rem,5vw,4rem)] font-bold">{value}</p>
    </div>
  );
}
