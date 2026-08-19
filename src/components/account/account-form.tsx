"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_POSITION_LABELS,
  FIELD_POSITIONS,
  PREFERRED_FOOT_LABELS,
} from "@/lib/field-positions";
import type { ProfileField } from "@/server/users/profile-access";

type ProfileFormProps = {
  initial: {
    displayName: string;
    applicationMessage?: string | null;
    avatarAssetId?: string | null;
    avatarUrl?: string | null;
    status: string;
    signature?: string | null;
    studentId?: string | null;
    fieldPositions?: string[];
    preferredFoot?: "LEFT" | "RIGHT" | "BOTH" | null;
  };
  allowApplicationMessage?: boolean;
  editable?: Partial<Record<ProfileField, boolean>>;
  savePath?: string;
  showPassword?: boolean;
};

const DEFAULT_EDITABLE: Partial<Record<ProfileField, boolean>> = {
  displayName: true,
  avatar: true,
  signature: true,
  studentId: true,
  fieldPositions: true,
  preferredFoot: true,
};

export function AccountForm({
  initial,
  allowApplicationMessage = false,
  editable = DEFAULT_EDITABLE,
  savePath = "/api/account/profile",
  showPassword = true,
}: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [applicationMessage, setApplicationMessage] = useState(initial.applicationMessage ?? "");
  const [avatarAssetId, setAvatarAssetId] = useState<string | null>(initial.avatarAssetId ?? null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatarUrl ?? null);
  const [signature, setSignature] = useState(initial.signature ?? "");
  const [studentId, setStudentId] = useState(initial.studentId ?? "");
  const [fieldPositions, setFieldPositions] = useState<string[]>(initial.fieldPositions ?? []);
  const [preferredFoot, setPreferredFoot] = useState<"LEFT" | "RIGHT" | "BOTH" | "">(
    initial.preferredFoot ?? "",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadAvatar(file: File) {
    const presign = await fetch("/api/account/media/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        purpose: "AVATAR",
      }),
    });
    const presignBody = await presign.json();
    if (!presign.ok) throw new Error(presignBody.message || "上传初始化失败");
    const put = await fetch(presignBody.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error("上传失败");
    const complete = await fetch("/api/account/media/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: presignBody.data.asset.id }),
    });
    const completeBody = await complete.json();
    if (!complete.ok) throw new Error(completeBody.message || "上传确认失败");
    setAvatarAssetId(presignBody.data.asset.id);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editable.displayName) payload.displayName = displayName;
      if (allowApplicationMessage) payload.applicationMessage = applicationMessage;
      if (editable.avatar) payload.avatarAssetId = avatarAssetId;
      if (editable.signature) payload.signature = signature || null;
      if (editable.studentId) payload.studentId = studentId || null;
      if (editable.fieldPositions) payload.fieldPositions = fieldPositions;
      if (editable.preferredFoot) payload.preferredFoot = preferredFoot || null;
      const res = await fetch(savePath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "保存失败");
      toast.success("资料已保存");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "修改密码失败");
      toast.success("密码已更新");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改密码失败");
    } finally {
      setBusy(false);
    }
  }

  function togglePosition(code: string) {
    setFieldPositions((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={saveProfile} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="bg-muted flex size-16 items-center justify-center overflow-hidden rounded-full text-lg font-bold">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="头像" className="size-full object-cover" />
            ) : (
              displayName.slice(0, 1)
            )}
          </div>
          {editable.avatar ? (
            <div>
              <Label htmlFor="avatar">头像</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void uploadAvatar(file).catch((error) =>
                    toast.error(error instanceof Error ? error.message : "上传失败"),
                  );
                }}
              />
            </div>
          ) : null}
        </div>
        {editable.displayName ? (
          <div className="space-y-2">
            <Label htmlFor="displayName">昵称</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        ) : null}
        {editable.signature ? (
          <div className="space-y-2">
            <Label htmlFor="signature">个性签名</Label>
            <Textarea
              id="signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>
        ) : null}
        {editable.studentId ? (
          <div className="space-y-2">
            <Label htmlFor="studentId">学号</Label>
            <Input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              maxLength={32}
            />
          </div>
        ) : null}
        {editable.fieldPositions ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">场上位置（可多选）</legend>
            <div className="flex flex-wrap gap-2">
              {FIELD_POSITIONS.map((code) => (
                <label
                  key={code}
                  className="border-input bg-background flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={fieldPositions.includes(code)}
                    onChange={() => togglePosition(code)}
                  />
                  {FIELD_POSITION_LABELS[code]}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {editable.preferredFoot ? (
          <div className="space-y-2">
            <Label htmlFor="preferredFoot">惯用脚</Label>
            <select
              id="preferredFoot"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={preferredFoot}
              onChange={(e) => setPreferredFoot(e.target.value as "LEFT" | "RIGHT" | "BOTH" | "")}
            >
              <option value="">未填写</option>
              {Object.entries(PREFERRED_FOOT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {allowApplicationMessage && (
          <div className="space-y-2">
            <Label htmlFor="applicationMessage">申请留言</Label>
            <Textarea
              id="applicationMessage"
              value={applicationMessage}
              onChange={(e) => setApplicationMessage(e.target.value)}
              rows={3}
            />
          </div>
        )}
        <Button type="submit" disabled={busy}>
          保存资料
        </Button>
      </form>

      {showPassword && initial.status === "ACTIVE" && (
        <form onSubmit={savePassword} className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold">修改密码</h2>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">当前密码</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            更新密码
          </Button>
        </form>
      )}
    </div>
  );
}
