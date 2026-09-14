"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupSpend } from "@/lib/types";
import { Button, Card, ErrorText, Shell } from "@/components/Shell";
import { AdminNav } from "@/components/AdminNav";
import { AccessLinks } from "@/components/AccessLinks";

export default function AdminAnalyticsPage() {
  const [rows, setRows] = useState<GroupSpend[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const load = () =>
      supabase
        .from("order_group_spend")
        .select("*")
        .then(({ data, error }: { data: GroupSpend[] | null; error: { message: string } | null }) => {
          if (error) setError(error.message);
          else setRows(data ?? []);
        });
    load();
    const ch = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_orders" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const resetAll = async () => {
    if (
      !window.confirm(
        "Reset ALL group points? This deletes every order for every group and cannot be undone.",
      )
    )
      return;
    setResetting(true);
    setError(null);
    const { error } = await createClient()
      .from("order_orders")
      .delete()
      .gte("created_at", "1970-01-01");
    if (error) setError(error.message);
    setResetting(false);
  };

  const totalPoints = rows.reduce((n, r) => n + r.points_spent, 0);
  const totalOrders = rows.reduce((n, r) => n + r.order_count, 0);
  const activeOrders = rows.reduce((n, r) => n + r.active_orders, 0);

  return (
    <Shell title="Admin · Analytics" right={<AdminNav />}>
      <ErrorText>{error}</ErrorText>
      <div className="mb-6">
        <AccessLinks />
      </div>
      <div className="mb-4 flex justify-end">
        <Button variant="danger" onClick={resetAll} disabled={resetting || totalOrders === 0}>
          {resetting ? "Resetting…" : "Reset all group points"}
        </Button>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total points spent" value={totalPoints} />
        <Stat label="Active orders" value={activeOrders} />
        <Stat label="Total orders" value={totalOrders} />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="pb-2">Group</th>
              <th className="pb-2 text-right">Points spent</th>
              <th className="pb-2 text-right">Active</th>
              <th className="pb-2 text-right">Orders</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.group_id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-2">{r.group_name}</td>
                <td className="py-2 text-right font-medium">{r.points_spent}</td>
                <td className="py-2 text-right">{r.active_orders}</td>
                <td className="py-2 text-right">{r.order_count}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-zinc-500">
                  No groups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </Card>
  );
}
