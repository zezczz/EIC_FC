"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteCrest } from "@/components/brand/site-crest";
import { cn } from "@/lib/utils";

export type SiteHeaderUser = {
  displayName: string;
  status: string;
  avatarUrl: string | null;
  isStaff: boolean;
};

function navLinkClass(active: boolean) {
  return cn(
    "rounded-md px-2 py-1 text-sm transition-colors",
    active
      ? "bg-accent font-medium text-primary"
      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
  );
}

export function SiteHeaderBar({ user }: { user: SiteHeaderUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const publicLinks = [
    { href: "/team", label: "球队介绍" },
    { href: "/news", label: "球队动态" },
  ];
  const memberLinks =
    user?.status === "ACTIVE"
      ? [
          { href: "/relay", label: "活动接龙" },
          { href: "/members", label: "队员名册" },
          { href: "/account", label: "我的资料" },
        ]
      : [];
  const staffLinks = user?.isStaff ? [{ href: "/captain", label: "后台" }] : [];
  const links = [...publicLinks, ...memberLinks, ...staffLinks];

  function isActive(href: string) {
    if (href === "/captain") return pathname === "/captain" || pathname.startsWith("/captain/");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-sideline sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          <SiteCrest className="h-10" decorative />
          <span className="min-w-0 leading-tight">
            <span className="font-brand block text-xl tracking-wide">EIC FC</span>
            <span className="text-muted-foreground hidden text-[10px] tracking-[0.22em] uppercase sm:block">
              Club House
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass(isActive(link.href))}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="text-muted-foreground hidden items-center gap-2 text-sm lg:inline-flex">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
                ) : null}
                {user.displayName}
              </span>
              <SignOutButton variant="ghost" size="sm" />
            </>
          ) : (
            <>
              <Button render={<Link href="/login" />} variant="ghost" size="sm">
                登录
              </Button>
              <Button render={<Link href="/register" />} size="sm">
                注册
              </Button>
            </>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
          <span className="sr-only">{open ? "关闭菜单" : "打开菜单"}</span>
        </Button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-sideline bg-card border-t px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="移动导航">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(navLinkClass(isActive(link.href)), "px-3 py-2")}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="border-sideline mt-4 flex flex-col gap-2 border-t pt-4">
            {user ? (
              <>
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
                  ) : null}
                  {user.displayName}
                </p>
                <SignOutButton variant="outline" size="sm" />
              </>
            ) : (
              <>
                <Button
                  render={<Link href="/login" />}
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  登录
                </Button>
                <Button render={<Link href="/register" />} onClick={() => setOpen(false)}>
                  注册
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
