import { redirect } from "next/navigation";
import { getStaffSession } from "@/server/auth/guards";
import { navItemsForPermissions } from "@/server/auth/permissions";
import { getSessionUser } from "@/server/auth/session";
import { CaptainNav } from "@/components/captain/captain-nav";

export const dynamic = "force-dynamic";

export default async function CaptainLayout({ children }: { children: React.ReactNode }) {
  const baseUser = await getSessionUser();
  if (!baseUser) redirect("/login");
  if (baseUser.status !== "ACTIVE") redirect("/pending");

  const sessionUser = await getStaffSession(baseUser.id);
  if (!sessionUser) redirect("/");

  const nav = navItemsForPermissions(sessionUser.permissions, sessionUser.role);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="w-full shrink-0 md:w-52">
        <p className="font-brand text-primary mb-2 hidden px-2 text-[0.65rem] tracking-[0.28em] uppercase md:block">
          Captain
        </p>
        <CaptainNav items={nav} />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
