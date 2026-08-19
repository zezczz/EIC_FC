import { Suspense } from "react";
import CaptainUsersClient from "./users-client";
import { requireAnyPermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function CaptainUsersPage() {
  await requireAnyPermission(
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_REVIEW,
    PERMISSIONS.USERS_ROLES,
  );
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">加载中…</p>}>
      <CaptainUsersClient />
    </Suspense>
  );
}
