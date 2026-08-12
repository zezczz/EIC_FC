"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RelayActions({
  id,
  status,
}: {
  id: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED" | "FINISHED";
}) {
  const router = useRouter();
  async function action(name: string, method = "POST") {
    if ((name === "cancel" || method === "DELETE") && !window.confirm("确认执行此操作？")) {
      return;
    }
    const url = name ? `/api/captain/relays/${id}/${name}` : `/api/captain/relays/${id}`;
    const res = await fetch(url, { method });
    const body = await res.json();
    if (!res.ok) toast.error(body.message || "操作失败");
    else {
      toast.success("操作成功");
      router.refresh();
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <>
          <Button size="sm" onClick={() => void action("open")}>
            开放
          </Button>
          <Button size="sm" variant="destructive" onClick={() => void action("", "DELETE")}>
            删除
          </Button>
        </>
      )}
      {status === "OPEN" && (
        <>
          <Button size="sm" variant="outline" onClick={() => void action("close")}>
            关闭
          </Button>
          <Button size="sm" variant="destructive" onClick={() => void action("cancel")}>
            取消活动
          </Button>
        </>
      )}
      {status === "CLOSED" && (
        <>
          <Button size="sm" onClick={() => void action("finish")}>
            标记完成
          </Button>
          <Button size="sm" variant="destructive" onClick={() => void action("cancel")}>
            取消活动
          </Button>
        </>
      )}
    </div>
  );
}
