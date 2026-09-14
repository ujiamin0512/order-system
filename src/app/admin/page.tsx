"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupSpend } from "@/lib/types";
import { Button, Card, ErrorText, Input, Shell, TableWrap } from "@/components/Shell";
import { AdminNav } from "@/components/AdminNav";
import { AccessLinks } from "@/components/AccessLinks";

export default function AdminAnalyticsPage() {
  const [rows, setRows] = useState<GroupSpend[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulk, setBulk] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const load = () =>
      supabase
        .from("order_group_spend")
        .select("*")
        .then(
          ({
            data,
            error,
          }: {
            data: GroupSpend[] | null;
            error: { message: string } | null;
          }) => {
            if (error) setError(error.message);
            else setRows(data ?? []);
          },
        );
    load();
    const ch = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_orders" },
        () => load(),
      )
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

  const saveBalance = async (groupId: string, value: string) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) return setError("Points must be a whole number ≥ 0");
    setSavingId(groupId);
    setError(null);
    const { error } = await createClient()
      .from("order_groups")
      .update({ points_balance: n })
      .eq("id", groupId);
    if (error) setError(error.message);
    else {
      setDrafts((d) => {
        const next = { ...d };
        delete next[groupId];
        return next;
      });
      setRows((rs) =>
        rs.map((r) =>
          r.group_id === groupId
            ? { ...r, points_balance: n, points_remaining: n - r.points_spent }
            : r,
        ),
      );
    }
    setSavingId(null);
  };

  const setAllBalances = async () => {
    const n = Number(bulk);
    if (!Number.isInteger(n) || n < 0) return setError("Points must be a whole number ≥ 0");
    if (!window.confirm(`Set every group's points to ${n}?`)) return;
    setError(null);
    const { error } = await createClient()
      .from("order_groups")
      .update({ points_balance: n })
      .gte("created_at", "1970-01-01");
    if (error) setError(error.message);
    else {
      setBulk("");
      setDrafts({});
      setRows((rs) => rs.map((r) => ({ ...r, points_balance: n, points_remaining: n - r.points_spent })));
    }
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">Give all groups</span>
          <Input
            type="number"
            min={0}
            placeholder="e.g. 100"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            className="w-28"
          />
          <Button variant="secondary" onClick={setAllBalances} disabled={bulk === "" || rows.length === 0}>
            Apply
          </Button>
        </div>
        <Button
          variant="danger"
          onClick={resetAll}
          disabled={resetting || totalOrders === 0}
        >
          {resetting ? "Resetting…" : "Reset all group points"}
        </Button>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total points spent" value={totalPoints} />
        <Stat label="Active orders" value={activeOrders} />
        <Stat label="Total orders" value={totalOrders} />
      </div>
      <Card>
        <TableWrap>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="pb-2">Group</th>
                <th className="pb-2 text-right">Points given</th>
                <th className="pb-2 text-right">Spent</th>
                <th className="pb-2 text-right">Remaining</th>
                <th className="pb-2 text-right">Active</th>
                <th className="pb-2 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.group_id}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="py-2">{r.group_name}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        min={0}
                        value={drafts[r.group_id] ?? String(r.points_balance)}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [r.group_id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveBalance(r.group_id, e.currentTarget.value);
                        }}
                        className="w-24 text-right"
                      />
                      {drafts[r.group_id] !== undefined &&
                        drafts[r.group_id] !== String(r.points_balance) && (
                          <Button
                            onClick={() => saveBalance(r.group_id, drafts[r.group_id])}
                            disabled={savingId === r.group_id}
                          >
                            Save
                          </Button>
                        )}
                    </div>
                  </td>
                  <td className="py-2 text-right font-medium">
                    {r.points_spent}
                  </td>
                  <td
                    className={`py-2 text-right font-semibold ${
                      r.points_remaining < 0 ? "text-red-600" : ""
                    }`}
                  >
                    {r.points_remaining}
                  </td>
                  <td className="py-2 text-right">{r.active_orders}</td>
                  <td className="py-2 text-right">{r.order_count}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-zinc-500">
                    No groups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
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
