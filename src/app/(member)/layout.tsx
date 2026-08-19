import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/**
 * 会员区布局守卫：仅 ACTIVE 用户可访问。
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login");
  }
  if (sessionUser.status !== "ACTIVE") {
    redirect("/pending");
  }

  return <main className="flex-1">{children}</main>;
}
