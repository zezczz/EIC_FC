import { Suspense } from "react";
import CaptainUsersClient from "./users-client";

export default function CaptainUsersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">加载中…</p>}>
      <CaptainUsersClient />
    </Suspense>
  );
}
