"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

type ApiError = { code: string; message: string; fieldErrors?: Record<string, string[]> };

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      username: form.get("username"),
      email: form.get("email"),
      displayName: form.get("displayName"),
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
      applicationMessage: form.get("applicationMessage") || undefined,
    };
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as ApiError;

      if (!res.ok) {
        toast.error(body.message || "注册失败");
        if (body.fieldErrors) {
          for (const [field, messages] of Object.entries(body.fieldErrors)) {
            const el = e.currentTarget.elements.namedItem(field) as HTMLElement | null;
            if (el) {
              el.setAttribute("data-error", messages.join("，"));
            }
          }
        }
        return;
      }
      toast.success("注册成功，请等待队长审核");
      router.push("/pending");
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="font-heading text-2xl font-black">申请加入 EIC FC</h1>
          <CardDescription>注册后需等待队长审核通过，方可参加活动接龙</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                name="username"
                placeholder="字母、数字、下划线或中文，3-32 位"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">昵称</Label>
              <Input id="displayName" name="displayName" maxLength={50} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                required
              />
              <p className="text-muted-foreground text-xs">至少 10 位，建议使用密码管理器生成</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applicationMessage">申请留言（可选）</Label>
              <Textarea
                id="applicationMessage"
                name="applicationMessage"
                maxLength={500}
                rows={3}
                placeholder="介绍一下自己，例如：队友介绍、想踢的位置"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "提交中…" : "提交申请"}
            </Button>
          </form>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            已有账号？{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              直接登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
