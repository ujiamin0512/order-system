"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Group } from "@/lib/types";
import { Button, Card, ErrorText, Input, Shell } from "@/components/Shell";
import { AdminNav } from "@/components/AdminNav";

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("Group");
  const [count, setCount] = useState(5);
  const [single, setSingle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await createClient().from("order_groups").select("*").order("name");
    if (error) setError(error.message);
    else setGroups(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bulkCreate = async () => {
    setBusy(true);
    setError(null);
    const existing = new Set(groups.map((g) => g.name));
    const names: string[] = [];
    let n = 1;
    while (names.length < count) {
      const name = `${prefix.trim()} ${n++}`;
      if (!existing.has(name)) names.push(name);
    }
    const { error } = await createClient()
      .from("order_groups")
      .insert(names.map((name) => ({ name })));
    if (error) setError(error.message);
    await load();
    setBusy(false);
  };

  const createOne = async () => {
    if (!single.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("order_groups").insert({ name: single.trim() });
    if (error) setError(error.message);
    else setSingle("");
    await load();
    setBusy(false);
  };

  const rename = async (g: Group) => {
    const name = window.prompt("New name", g.name)?.trim();
    if (!name || name === g.name) return;
    const { error } = await createClient().from("order_groups").update({ name }).eq("id", g.id);
    if (error) setError(error.message);
    load();
  };

  const remove = async (g: Group) => {
    if (!window.confirm(`Delete "${g.name}"? All of its orders will be deleted too.`)) return;
    const { error } = await createClient().from("order_groups").delete().eq("id", g.id);
    if (error) setError(error.message);
    load();
  };

  return (
    <Shell title="Admin · Groups" right={<AdminNav />}>
      <ErrorText>{error}</ErrorText>
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-3">
            <h2 className="font-semibold">Bulk create</h2>
            <label className="block space-y-1 text-sm">
              <span>Name prefix</span>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>How many</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value))))}
              />
            </label>
            <p className="text-xs text-zinc-500">
              Creates {prefix.trim()} 1 … {prefix.trim()} {count}, skipping names that already exist.
            </p>
            <Button className="w-full" onClick={bulkCreate} disabled={busy || !prefix.trim()}>
              Create {count} groups
            </Button>
          </Card>
          <Card className="space-y-3">
            <h2 className="font-semibold">Add one</h2>
            <Input
              placeholder="Group name"
              value={single}
              onChange={(e) => setSingle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createOne()}
            />
            <Button variant="secondary" className="w-full" onClick={createOne} disabled={busy}>
              Add group
            </Button>
          </Card>
        </div>

        <Card>
          <h2 className="mb-3 font-semibold">Groups ({groups.length})</h2>
          {groups.length === 0 ? (
            <p className="text-sm text-zinc-500">No groups yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {groups
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                .map((g) => (
                  <li key={g.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{g.name}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => rename(g)}>
                        Rename
                      </Button>
                      <Button variant="ghost" onClick={() => remove(g)}>
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
