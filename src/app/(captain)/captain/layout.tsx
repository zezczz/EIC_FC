import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getStaffSession } from "@/server/auth/guards";
import { navItemsForPermissions } from "@/server/auth/permissions";
import { getSessionUser } from "@/server/auth/session";

export default async function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUser = await getSessionUser();
  if (!baseUser) redirect("/login");
  if (baseUser.status !== "ACTIVE") redirect("/pending");

  const sessionUser = await getStaffSession(baseUser.id);
  if (!sessionUser) redirect("/");

  const nav = navItemsForPermissions(sessionUser.permissions);

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
