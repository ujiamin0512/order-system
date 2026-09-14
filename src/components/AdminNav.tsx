"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Shell";

const links = [
  { href: "/admin", label: "Analytics" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/products", label: "Products" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-md px-2 py-1 text-sm ${
            pathname === l.href
              ? "bg-zinc-100 font-medium dark:bg-zinc-800"
              : "text-zinc-600 hover:underline dark:text-zinc-300"
          }`}
        >
          {l.label}
        </Link>
      ))}
      <Button
        variant="ghost"
        onClick={async () => {
          await createClient().auth.signOut();
          router.push("/admin/login");
          router.refresh();
        }}
      >
        Sign out
      </Button>
    </>
  );
}
