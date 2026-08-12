"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ArticleActions({
  id,
  status,
  pinned,
  deleted,
}: {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  pinned: boolean;
  deleted: boolean;
}) {
  const router = useRouter();

  async function action(name: string, method = "POST", body?: unknown) {
    if (name === "" && !window.confirm("确认删除这篇文章？可在 30 天内恢复。")) return;
    const path = name ? `/api/captain/articles/${id}/${name}` : `/api/captain/articles/${id}`;
    const response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.message || "操作失败");
      return;
    }
    toast.success("操作成功");
    router.refresh();
  }

  if (deleted) {
    return (
      <Button size="sm" onClick={() => void action("restore")}>
        恢复
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <Button size="sm" onClick={() => void action("publish")}>
          发布
        </Button>
      )}
      {status === "PUBLISHED" && (
        <>
          <Button size="sm" variant="outline" onClick={() => void action("unpublish")}>
            取消发布
          </Button>
          <Button size="sm" variant="outline" onClick={() => void action("archive")}>
            归档
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void action(pinned ? "unpin" : "pin", "POST", pinned ? undefined : { pinOrder: 0 })
            }
          >
            {pinned ? "取消置顶" : "置顶"}
          </Button>
        </>
      )}
      {status === "ARCHIVED" && (
        <Button size="sm" onClick={() => void action("publish")}>
          重新发布
        </Button>
      )}
      <Button size="sm" variant="destructive" onClick={() => void action("", "DELETE")}>
        删除
      </Button>
    </div>
  );
}
