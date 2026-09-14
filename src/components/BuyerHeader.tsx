"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cartTotal, useCart } from "@/store/cart";
import { Button } from "@/components/Shell";

export function BuyerHeaderRight() {
  const router = useRouter();
  const { groupName, lines, clearGroup } = useCart();
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  return (
    <>
      <span className="hidden text-zinc-500 sm:inline">{groupName}</span>
      <Link
        href="/cart"
        className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Cart · {count} item{count === 1 ? "" : "s"} · {cartTotal(lines)} pts
      </Link>
      <Button
        variant="ghost"
        onClick={() => {
          clearGroup();
          router.push("/");
        }}
      >
        Switch group
      </Button>
    </>
  );
}
