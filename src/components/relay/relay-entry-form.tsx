"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RelayEntryForm({
  relayId,
  disabled,
  initial,
}: {
  relayId: string;
  disabled: boolean;
  initial?: {
    participantCount: number;
    companionNames: string[];
    note: string | null;
    response: string;
  } | null;
}) {
  const router = useRouter();
  const [participantCount, setParticipantCount] = useState(initial?.participantCount ?? 1);
  const [companionNames, setCompanionNames] = useState<string[]>(
    initial?.companionNames ?? [],
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);

  function updateParticipantCount(next: number) {
    setParticipantCount(next);
    const expected = Math.max(0, next - 1);
    setCompanionNames((current) => {
      if (current.length === expected) return current;
      if (current.length > expected) return current.slice(0, expected);
      return [...current, ...Array.from({ length: expected - current.length }, () => "")];
    });
  }

  async function submit(response: "JOINED" | "DECLINED") {
    setBusy(true);
    try {
      const payload = {
        response,
        participantCount,
        companionNames: response === "JOINED" ? companionNames.map((name) => name.trim()) : [],
        note: note || null,
      };
      const res = await fetch(`/api/relays/${relayId}/entry`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "提交失败");
      toast.success(body.data.entry.response === "WAITLISTED" ? "已进入候补" : "接龙已更新");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("确认取消本次接龙？")) return;
    setBusy(true);
    const res = await fetch(`/api/relays/${relayId}/entry`, { method: "DELETE" });
    const body = await res.json();
    if (res.ok) {
      toast.success("已取消报名");
      router.refresh();
    } else toast.error(body.message || "取消失败");
    setBusy(false);
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h2 className="font-bold">我的接龙</h2>
      {initial && <p className="text-muted-foreground text-sm">当前状态：{initial.response}</p>}
      <div className="space-y-2">
        <Label htmlFor="participantCount">参加人数（含本人）</Label>
        <Input
          id="participantCount"
          type="number"
          min={1}
          max={20}
          value={participantCount}
          onChange={(e) => updateParticipantCount(Number(e.target.value))}
        />
      </div>
      {participantCount > 1 && (
        <div className="space-y-3">
          <Label>同行人员姓名</Label>
          {companionNames.map((name, index) => (
            <div key={index} className="space-y-1">
              <Label htmlFor={`companion-${index}`} className="text-muted-foreground text-xs">
                同行 {index + 1}
              </Label>
              <Input
                id={`companion-${index}`}
                value={name}
                onChange={(e) =>
                  setCompanionNames((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? e.target.value : item,
                    ),
                  )
                }
                maxLength={50}
                required
              />
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="note">备注</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled || busy} onClick={() => void submit("JOINED")}>
          {initial ? "更新报名" : "参加"}
        </Button>
        <Button
          variant="outline"
          disabled={disabled || busy}
          onClick={() => void submit("DECLINED")}
        >
          无法参加
        </Button>
        {initial && (
          <Button variant="destructive" disabled={disabled || busy} onClick={() => void remove()}>
            取消记录
          </Button>
        )}
      </div>
    </div>
  );
}
