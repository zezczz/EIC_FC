"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";

type ApiError = { code: string; message: string; fieldErrors?: Record<string, string[]> };

export default function LoginPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password }),
      });
      const body = (await res.json()) as ApiError & { data?: { user: { status: string; role: string } } };

      if (!res.ok) {
        const err = body as ApiError;
        toast.error(err.message || "登录失败");
        return;
      }

      const user = body.data?.user;
      toast.success("登录成功");
      if (user?.status === "PENDING") {
        router.push("/pending");
      } else if (user?.role === "CAPTAIN") {
        router.push("/captain");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>登录</CardTitle>
            <CardDescription>使用用户名或邮箱登录 EIC FC</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identity">用户名或邮箱</Label>
                <Input
                  id="identity"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "登录中…" : "登录"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              还没有账号？{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                申请加入
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
