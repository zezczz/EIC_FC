"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * 退出登录按钮（调用 /api/auth/signout 后刷新）。
 */
export function SignOutButton({
  variant = "outline",
  size = "sm",
}: {
  variant?: "outline" | "ghost" | "default" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
}) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant={variant} size={size} onClick={handleSignOut}>
      退出
    </Button>
  );
}
