"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CaptainNav({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/captain") return pathname === "/captain";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="border-sideline bg-card flex flex-row gap-1 overflow-x-auto rounded-xl border p-1 md:flex-col">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
            isActive(item.href)
              ? "bg-accent text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
