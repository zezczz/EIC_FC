"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type InitialRelay = {
  id: string;
  title: string;
  description: string;
  eventAt: string;
  eventEndsAt: string | null;
  location: string;
  signupDeadline: string;
  capacity: number | null;
  waitlistEnabled: boolean;
  version: number;
};

function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function RelayForm({ initial }: { initial?: InitialRelay }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const eventEndsAt = String(form.get("eventEndsAt") || "");
    const capacity = String(form.get("capacity") || "");
    const payload = {
      title: form.get("title"),
      description: form.get("description"),
      eventAt: new Date(String(form.get("eventAt"))).toISOString(),
      eventEndsAt: eventEndsAt ? new Date(eventEndsAt).toISOString() : null,
      location: form.get("location"),
      signupDeadline: new Date(String(form.get("signupDeadline"))).toISOString(),
      capacity: capacity ? Number(capacity) : null,
      waitlistEnabled: form.get("waitlistEnabled") === "on",
      ...(initial ? { version: initial.version } : {}),
    };
    try {
      const res = await fetch(
        initial ? `/api/captain/relays/${initial.id}` : "/api/captain/relays",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "保存失败");
      toast.success("接龙已保存");
      router.push("/captain/relays");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="title">标题</Label>
        <Input id="title" name="title" required maxLength={120} defaultValue={initial?.title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">说明</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={2000}
          rows={5}
          defaultValue={initial?.description}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="eventAt">开始时间</Label>
          <Input
            id="eventAt"
            name="eventAt"
            type="datetime-local"
            required
            defaultValue={localDate(initial?.eventAt)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventEndsAt">结束时间</Label>
          <Input
            id="eventEndsAt"
            name="eventEndsAt"
            type="datetime-local"
            defaultValue={localDate(initial?.eventEndsAt)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signupDeadline">报名截止</Label>
          <Input
            id="signupDeadline"
            name="signupDeadline"
            type="datetime-local"
            required
            defaultValue={localDate(initial?.signupDeadline)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">人数上限（留空不限）</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            defaultValue={initial?.capacity ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">地点</Label>
        <Input
          id="location"
          name="location"
          required
          maxLength={200}
          defaultValue={initial?.location}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          name="waitlistEnabled"
          type="checkbox"
          defaultChecked={initial?.waitlistEnabled ?? true}
        />
        满员后允许候补
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "保存中…" : "保存草稿"}
      </Button>
    </form>
  );
}
