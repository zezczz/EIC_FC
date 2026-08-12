import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/server/auth/session";

/**
 * 队长后台布局：服务端校验 CAPTAIN + ACTIVE
 */
export default async function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  if (sessionUser.status !== "ACTIVE") redirect("/pending");
  if (sessionUser.role !== "CAPTAIN") redirect("/");

  const nav = [
    { href: "/captain", label: "概览" },
    { href: "/captain/users", label: "成员审核" },
    { href: "/captain/articles", label: "球队动态" },
    { href: "/captain/relays", label: "活动接龙" },
    { href: "/captain/audit", label: "审计日志" },
  ];

  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="w-full shrink-0 md:w-48">
          <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
