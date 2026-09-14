"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button, Card, Input } from "@/components/Shell";

const PAGES = [
  { key: "buyer", label: "Buyer page", path: "/", hint: "Groups pick their name and shop" },
  { key: "seller", label: "Seller page", path: "/seller", hint: "Live order feed, no login" },
] as const;

/** QR codes + links for the public buyer and seller pages, so people can scan in. */
export function AccessLinks() {
  const [base, setBase] = useState("");
  const [qr, setQr] = useState<Record<string, string>>({});

  useEffect(() => {
    setBase(window.location.origin);
  }, []);

  useEffect(() => {
    if (!base) return;
    let cancelled = false;
    Promise.all(
      PAGES.map((p) =>
        QRCode.toDataURL(base + p.path, { width: 220, margin: 1 }).then((d) => [p.key, d] as const),
      ),
    ).then((entries) => {
      if (!cancelled) setQr(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [base]);

  const copy = (url: string) => navigator.clipboard?.writeText(url);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold">Access links</h2>
          <p className="text-xs text-zinc-500">
            Phones can&apos;t reach <code>localhost</code> — use this PC&apos;s network address
            (shown in the terminal as &quot;Network:&quot;) or your deployed URL.
          </p>
        </div>
        <label className="w-full text-sm sm:w-72">
          <span className="mb-1 block text-xs text-zinc-500">Base URL</span>
          <Input value={base} onChange={(e) => setBase(e.target.value.trim())} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PAGES.map((p) => {
          const url = base + p.path;
          return (
            <div
              key={p.key}
              className="flex flex-col items-center gap-2 rounded-md border border-zinc-200 p-4 text-center dark:border-zinc-800"
            >
              <h3 className="font-medium">{p.label}</h3>
              <p className="text-xs text-zinc-500">{p.hint}</p>
              {qr[p.key] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr[p.key]} alt={`QR code for ${p.label}`} className="h-[220px] w-[220px] rounded bg-white" />
              ) : (
                <div className="h-[220px] w-[220px] rounded bg-zinc-100 dark:bg-zinc-800" />
              )}
              <code className="break-all text-xs">{url}</code>
              <div className="flex gap-2">
                <a href={url} target="_blank" rel="noreferrer">
                  <Button variant="secondary">Open</Button>
                </a>
                <Button variant="ghost" onClick={() => copy(url)}>
                  Copy link
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
