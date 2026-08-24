"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/brand/page-header";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  STAFF_TITLE_LABELS,
  STAFF_TITLE_PRESETS,
  type Permission,
} from "@/server/auth/permissions";
import {
  DEFAULT_PROFILE_PERMISSIONS,
  PROFILE_FIELD_LABELS,
  PROFILE_FIELDS,
  profilePermissionCode,
  resolveProfilePermissions,
  type ProfileField,
} from "@/server/users/profile-access";

type UserItem = {
  id: string;
  username: string;
  displayName: string;
  role: "MEMBER" | "STAFF" | "CAPTAIN";
  staffTitle?: "COACH" | "VICE_CAPTAIN" | "MANAGER" | null;
  teamTitle?: string | null;
  permissions?: string[];
  profilePermissions?: string[];
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  applicationMessage: string | null;
  reviewReason: string | null;
  createdAt: string;
};

type DialogMode = "reject" | "suspend" | "access" | "create" | null;

export default function CaptainUsersClient() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "PENDING";
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [target, setTarget] = useState<UserItem | null>(null);
  const [reason, setReason] = useState("");
  const [teamTitle, setTeamTitle] = useState("");
  const [role, setRole] = useState<"MEMBER" | "STAFF">("MEMBER");
  const [staffTitle, setStaffTitle] = useState<"COACH" | "VICE_CAPTAIN" | "MANAGER" | "">("");
  const [modulePermissions, setModulePermissions] = useState<Permission[]>([]);
  const [profileCodes, setProfileCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    displayName: "",
    password: "",
  });

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
    const controller = new AbortController();
    void (async () => {
      try {
        const qs = statusFilter ? `?status=${statusFilter}` : "";
        const res = await fetch(`/api/captain/users${qs}`, { signal: controller.signal });
        const body = await res.json();
        if (controller.signal.aborted) return;
        if (!res.ok) {
          toast.error(body.message || "加载失败");
          return;
        }
        setItems(body.data.items);
      } catch (error) {
        if (controller.signal.aborted) return;
        toast.error(error instanceof Error ? error.message : "加载失败");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [statusFilter]);

  async function postAction(path: string, body?: unknown, method = "POST") {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method,
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

  function openAccess(user: UserItem) {
    setTarget(user);
    setTeamTitle(user.teamTitle ?? "");
    setRole(user.role === "STAFF" ? "STAFF" : "MEMBER");
    setStaffTitle(user.staffTitle ?? "");
    setModulePermissions(
      (user.permissions ?? []).filter((code): code is Permission =>
        Object.prototype.hasOwnProperty.call(PERMISSION_LABELS, code),
      ),
    );
    setProfileCodes(
      resolveProfilePermissions({
        role: user.role,
        profilePermissions: user.profilePermissions ?? [],
      }),
    );
    setDialogMode("access");
  }

  function applyPreset(title: "COACH" | "VICE_CAPTAIN" | "MANAGER" | "MEMBER") {
    if (title === "MEMBER") {
      setRole("MEMBER");
      setStaffTitle("");
      setModulePermissions([]);
      return;
    }
    setRole("STAFF");
    setStaffTitle(title);
    setModulePermissions([...STAFF_TITLE_PRESETS[title]]);
  }

  function toggleModule(code: Permission) {
    setModulePermissions((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  function toggleProfile(code: string) {
    setProfileCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  const filters = ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Squad"
        title="成员权限"
        description="批准、拒绝、停用，或直接开通队员账号；按人配置查看/编辑权限与职务名称"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setCreateForm({ username: "", displayName: "", password: "" });
              setDialogMode("create");
            }}
          >
            添加队员
          </Button>
        }
      />

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
        <p className="text-muted-foreground text-sm">加载中…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center">暂无用户</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((u) => (
            <Card key={u.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    {u.displayName}{" "}
                    <span className="text-muted-foreground text-sm font-normal">@{u.username}</span>
                  </CardTitle>
                  <Badge variant="secondary">{u.status}</Badge>
                  <Badge variant="outline">{u.role}</Badge>
                  {u.teamTitle ? <Badge>{u.teamTitle}</Badge> : null}
                  {u.staffTitle ? (
                    <Badge variant="secondary">{STAFF_TITLE_LABELS[u.staffTitle]}</Badge>
                  ) : null}
                </div>
                <CardDescription>注册于 {formatDateTime(u.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {u.applicationMessage && (
                  <p className="text-sm">申请留言：{u.applicationMessage}</p>
                )}
                {u.reviewReason && (
                  <p className="text-muted-foreground text-sm">原因：{u.reviewReason}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {u.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => void postAction(`/api/captain/users/${u.id}/approve`)}
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
                      <Button size="sm" variant="secondary" onClick={() => openAccess(u)}>
                        管理权限
                      </Button>
                      {u.role !== "CAPTAIN" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void postAction(`/api/captain/users/${u.id}/role`, { role: "CAPTAIN" })
                          }
                        >
                          升为队长
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void postAction(`/api/captain/users/${u.id}/role`, { role: "MEMBER" })
                          }
                        >
                          降为队员
                        </Button>
                      )}
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
                    </>
                  )}
                  {u.status === "SUSPENDED" && (
                    <Button
                      size="sm"
                      onClick={() => void postAction(`/api/captain/users/${u.id}/restore`)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {dialogMode === "create" ? (
            <>
              <DialogHeader>
                <DialogTitle>添加队员</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void (async () => {
                    setBusy(true);
                    try {
                      const res = await fetch("/api/captain/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(createForm),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        toast.error(data.message || "创建失败");
                        return;
                      }
                      toast.success("已开通队员账号");
                      setDialogMode(null);
                      setCreateForm({ username: "", displayName: "", password: "" });
                      await load();
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="create-username">用户名</Label>
                  <Input
                    id="create-username"
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm((current) => ({ ...current, username: e.target.value }))
                    }
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-displayName">显示名</Label>
                  <Input
                    id="create-displayName"
                    value={createForm.displayName}
                    onChange={(e) =>
                      setCreateForm((current) => ({ ...current, displayName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">初始密码</Label>
                  <Input
                    id="create-password"
                    type="password"
                    minLength={10}
                    maxLength={128}
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((current) => ({ ...current, password: e.target.value }))
                    }
                    autoComplete="new-password"
                    required
                  />
                  <p className="text-muted-foreground text-xs">
                    至少 10 位；线下告知队员后请提醒其尽快修改。
                  </p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>
                    {busy ? "创建中…" : "创建账号"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : dialogMode === "access" && target ? (
            <>
              <DialogHeader>
                <DialogTitle>管理 {target.displayName} 的权限</DialogTitle>
              </DialogHeader>
              {target.role === "CAPTAIN" ? (
                <p className="text-muted-foreground text-sm">
                  队长默认拥有全部权限，职务名称可单独修改。
                </p>
              ) : null}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="teamTitle">
                  自定义职务名
                </label>
                <Input
                  id="teamTitle"
                  value={teamTitle}
                  onChange={(e) => setTeamTitle(e.target.value)}
                  maxLength={50}
                  placeholder="例如：队长助理、摄影、队医"
                />
              </div>
              {target.role !== "CAPTAIN" ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => applyPreset("MEMBER")}>
                      普通队员
                    </Button>
                    {(
                      Object.keys(STAFF_TITLE_LABELS) as Array<keyof typeof STAFF_TITLE_LABELS>
                    ).map((title) => (
                      <Button
                        key={title}
                        size="sm"
                        variant="outline"
                        onClick={() => applyPreset(title)}
                      >
                        {STAFF_TITLE_LABELS[title]}预设
                      </Button>
                    ))}
                  </div>
                  {PERMISSION_GROUPS.map((group) => (
                    <fieldset key={group.label} className="space-y-2">
                      <legend className="text-sm font-medium">{group.label}</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.items.map((code) => (
                          <label key={code} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={modulePermissions.includes(code)}
                              onChange={() => toggleModule(code)}
                            />
                            {PERMISSION_LABELS[code]}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">资料字段</legend>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="py-1 pr-2">字段</th>
                            <th className="py-1 pr-2">看他人</th>
                            <th className="py-1 pr-2">改自己</th>
                            <th className="py-1 pr-2">改他人</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PROFILE_FIELDS.map((field: ProfileField) => (
                            <tr key={field}>
                              <td className="py-1 pr-2">{PROFILE_FIELD_LABELS[field]}</td>
                              {(["view", "edit-self", "edit-others"] as const).map((kind) => {
                                const code = profilePermissionCode(kind, field);
                                const locked = field === "teamTitle" && kind !== "view";
                                return (
                                  <td key={kind} className="py-1 pr-2">
                                    <input
                                      type="checkbox"
                                      disabled={locked}
                                      checked={profileCodes.includes(code)}
                                      onChange={() => toggleProfile(code)}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setProfileCodes([...DEFAULT_PROFILE_PERMISSIONS])}
                    >
                      恢复默认资料权限
                    </Button>
                  </fieldset>
                </>
              ) : null}
              <DialogFooter>
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (!target) return;
                    void postAction(
                      `/api/captain/users/${target.id}/permissions`,
                      {
                        role: target.role === "CAPTAIN" ? undefined : role,
                        staffTitle: role === "STAFF" ? staffTitle || null : null,
                        teamTitle: teamTitle || null,
                        permissions: target.role === "CAPTAIN" ? [] : modulePermissions,
                        profilePermissions: profileCodes,
                      },
                      "PATCH",
                    );
                  }}
                >
                  保存权限
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{dialogMode === "reject" ? "拒绝申请" : "停用账号"}</DialogTitle>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
