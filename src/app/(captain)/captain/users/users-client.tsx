"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";

type UserItem = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: "MEMBER" | "CAPTAIN";
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  applicationMessage: string | null;
  reviewReason: string | null;
  createdAt: string;
};

type DialogMode = "reject" | "suspend" | null;

export default function CaptainUsersClient() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "PENDING";
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [target, setTarget] = useState<UserItem | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/captain/users${qs}`);
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message || "加载失败");
        return;
      }
      setItems(body.data.items);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAction(path: string, body?: unknown) {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "操作失败");
        return;
      }
      toast.success("操作成功");
      setDialogMode(null);
      setTarget(null);
      setReason("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  const filters = ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">成员审核</h1>
        <p className="text-sm text-muted-foreground">批准、拒绝、停用或调整角色</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            render={<a href={`/captain/users?status=${s}`} />}
          >
            {s}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">加载中…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            暂无用户
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((u) => (
            <Card key={u.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    {u.displayName}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      @{u.username}
                    </span>
                  </CardTitle>
                  <Badge variant="secondary">{u.status}</Badge>
                  <Badge variant="outline">{u.role}</Badge>
                </div>
                <CardDescription>
                  {u.email} · 注册于 {formatDateTime(u.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {u.applicationMessage && (
                  <p className="text-sm">申请留言：{u.applicationMessage}</p>
                )}
                {u.reviewReason && (
                  <p className="text-sm text-muted-foreground">原因：{u.reviewReason}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {u.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          void postAction(`/api/captain/users/${u.id}/approve`)
                        }
                        disabled={busy}
                      >
                        批准
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTarget(u);
                          setDialogMode("reject");
                        }}
                      >
                        拒绝
                      </Button>
                    </>
                  )}
                  {u.status === "ACTIVE" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTarget(u);
                          setDialogMode("suspend");
                        }}
                      >
                        停用
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void postAction(`/api/captain/users/${u.id}/role`, {
                            role: u.role === "CAPTAIN" ? "MEMBER" : "CAPTAIN",
                          })
                        }
                      >
                        {u.role === "CAPTAIN" ? "降为队员" : "升为队长"}
                      </Button>
                    </>
                  )}
                  {u.status === "SUSPENDED" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        void postAction(`/api/captain/users/${u.id}/restore`)
                      }
                      disabled={busy}
                    >
                      恢复
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null);
            setTarget(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "reject" ? "拒绝申请" : "停用账号"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请填写原因（必填）"
            rows={4}
          />
          <DialogFooter>
            <Button
              disabled={busy || !reason.trim()}
              onClick={() => {
                if (!target || !dialogMode) return;
                void postAction(`/api/captain/users/${target.id}/${dialogMode}`, {
                  reason,
                });
              }}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
