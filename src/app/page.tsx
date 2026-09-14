"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/store/cart";
import type { Group } from "@/lib/types";
import { Button, Card, ErrorText } from "@/components/Shell";

export default function EntryPage() {
  const router = useRouter();
  const setGroup = useCart((s) => s.setGroup);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("order_groups")
      .select("*")
      .order("name")
      .then(({ data, error }: { data: Group[] | null; error: { message: string } | null }) => {
        if (error) setError(error.message);
        else setGroups(data ?? []);
        setLoading(false);
      });
  }, []);

  const enter = () => {
    const g = groups.find((g) => g.id === selected);
    if (!g) return;
    setGroup(g.id, g.name);
    router.push("/market");
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Craft Market</h1>
          <p className="mt-1 text-sm text-zinc-500">Select your group to start shopping</p>
        </div>

        <Card className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Group</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">{loading ? "Loading…" : "Choose a group"}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          {!loading && groups.length === 0 && !error && (
            <p className="text-sm text-zinc-500">
              No groups yet. An admin needs to create them first.
            </p>
          )}
          <ErrorText>{error}</ErrorText>
          <Button className="w-full" onClick={enter} disabled={!selected}>
            Enter Market
          </Button>
        </Card>

        <div className="flex justify-center gap-4 text-xs text-zinc-500">
          <Link href="/seller" className="hover:underline">
            Seller dashboard
          </Link>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
