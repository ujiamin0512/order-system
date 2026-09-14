"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Input,
  Shell,
  TableWrap,
} from "@/components/Shell";
import { ProductImage } from "@/components/ProductImage";
import { AdminNav } from "@/components/AdminNav";

type Form = {
  name: string;
  points: string;
  is_rental: boolean;
  rental_minutes: string;
  max_per_group: string;
  global_inventory: string;
  image_url: string | null;
};

const emptyForm: Form = {
  name: "",
  points: "5",
  is_rental: false,
  rental_minutes: "5",
  max_per_group: "",
  global_inventory: "",
  image_url: null,
};

const toForm = (p: Product): Form => ({
  name: p.name,
  points: String(p.points),
  is_rental: p.is_rental,
  rental_minutes: String(p.rental_minutes),
  max_per_group: p.max_per_group === null ? "" : String(p.max_per_group),
  global_inventory:
    p.global_inventory === null ? "" : String(p.global_inventory),
  image_url: p.image_url,
});

const fromForm = (f: Form) => ({
  name: f.name.trim(),
  points: Number(f.points),
  is_rental: f.is_rental,
  rental_minutes: Number(f.rental_minutes),
  max_per_group: f.max_per_group === "" ? null : Number(f.max_per_group),
  global_inventory:
    f.global_inventory === "" ? null : Number(f.global_inventory),
  image_url: f.image_url,
});

/** Downscale an image in the browser and return it as a JPEG data URL (stored directly in the DB). */
async function resizeToDataUrl(file: File, maxSize: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("order_products")
      .select("*")
      .order("points")
      .order("name");
    if (error) setError(error.message);
    else setProducts(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (p: Product | null) => {
    setEditing(p ? p.id : "new");
    setForm(p ? toForm(p) : emptyForm);
    setFile(null);
    setError(null);
  };

  const save = async () => {
    const values = fromForm(form);
    if (!values.name) return setError("Name is required");
    if (!Number.isInteger(values.points) || values.points < 0)
      return setError("Points must be a whole number ≥ 0");
    if (
      values.is_rental &&
      (!Number.isInteger(values.rental_minutes) || values.rental_minutes < 1)
    )
      return setError("Rental minutes must be a whole number ≥ 1");
    if (
      values.max_per_group !== null &&
      (!Number.isInteger(values.max_per_group) || values.max_per_group < 1)
    )
      return setError("Max per group must be a whole number ≥ 1 (or blank)");
    if (
      values.global_inventory !== null &&
      (!Number.isInteger(values.global_inventory) ||
        values.global_inventory < 0)
    )
      return setError("Global inventory must be a whole number ≥ 0 (or blank)");

    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (file) {
      try {
        values.image_url = await resizeToDataUrl(file, 800);
      } catch (e) {
        setBusy(false);
        return setError(
          `Could not read image: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    const { error } =
      editing === "new"
        ? await supabase.from("order_products").insert(values)
        : await supabase
            .from("order_products")
            .update(values)
            .eq("id", editing!);
    setBusy(false);
    if (error) return setError(error.message);
    setEditing(null);
    load();
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    const { error } = await createClient()
      .from("order_products")
      .delete()
      .eq("id", p.id);
    if (error)
      setError(
        error.code === "23503"
          ? `"${p.name}" has been ordered and cannot be deleted. Set its inventory to 0 to hide it from the market instead.`
          : error.message,
      );
    load();
  };

  const field = (k: keyof Form) => ({
    value: form[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [k]: e.target.value }),
  });

  return (
    <Shell title="Admin · Products" right={<AdminNav />}>
      <ErrorText>{error}</ErrorText>
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <Card className="h-fit space-y-3">
          <h2 className="font-semibold">
            {editing === "new"
              ? "New product"
              : editing
                ? "Edit product"
                : "Product"}
          </h2>
          {editing === null ? (
            <Button className="w-full" onClick={() => startEdit(null)}>
              Add product
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <ProductImage
                  src={file ? URL.createObjectURL(file) : form.image_url}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-md"
                />
                <div className="space-y-1 text-sm">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-xs"
                  />
                  {(form.image_url || file) && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setFile(null);
                        setForm({ ...form, image_url: null });
                      }}
                    >
                      Remove picture
                    </Button>
                  )}
                </div>
              </div>
              <label className="block space-y-1 text-sm">
                <span>Name</span>
                <Input {...field("name")} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Points</span>
                <Input type="number" min={0} {...field("points")} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_rental}
                  onChange={(e) =>
                    setForm({ ...form, is_rental: e.target.checked })
                  }
                />
                <span>
                  Rental item (stock returns when the order is completed)
                </span>
              </label>
              {form.is_rental && (
                <label className="block space-y-1 text-sm">
                  <span>Rent duration (minutes)</span>
                  <Input type="number" min={1} {...field("rental_minutes")} />
                </label>
              )}
              <label className="block space-y-1 text-sm">
                <span>Max per group (blank = no limit)</span>
                <Input
                  type="number"
                  min={1}
                  placeholder="No limit"
                  {...field("max_per_group")}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Global inventory (blank = unlimited)</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  {...field("global_inventory")}
                />
              </label>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={save} disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setEditing(null)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card>
          <TableWrap>
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-right">Points</th>
                  <th className="pb-2">Rules</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="py-2 font-medium">
                      <div className="flex items-center gap-2">
                        <ProductImage
                          src={p.image_url}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded"
                        />
                        {p.name}
                      </div>
                    </td>
                    <td className="py-2 text-right">{p.points}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {p.is_rental && (
                          <Badge tone="warn">Rent {p.rental_minutes} min</Badge>
                        )}
                        {p.max_per_group !== null && (
                          <Badge>Max {p.max_per_group}/group</Badge>
                        )}
                        {p.global_inventory !== null && (
                          <Badge>Stock {p.global_inventory}</Badge>
                        )}
                        {!p.is_rental &&
                          p.max_per_group === null &&
                          p.global_inventory === null && (
                            <span className="text-xs text-zinc-400">
                              No limit
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <Button variant="ghost" onClick={() => startEdit(p)}>
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={() => remove(p)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      </div>
    </Shell>
  );
}
