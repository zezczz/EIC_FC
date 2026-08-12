"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type InitialArticle = {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string;
  contentJson: unknown;
  coverAssetId: string | null;
  version: number;
};

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function ArticleEditor({ initial }: { initial?: InitialArticle }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [coverAssetId, setCoverAssetId] = useState<string | null>(initial?.coverAssetId ?? null);
  const [busy, setBusy] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      ImageExtension.configure({ allowBase64: false }),
    ],
    content: initial?.contentJson ?? EMPTY_DOC,
    editorProps: {
      attributes: {
        class:
          "min-h-80 rounded-lg border bg-background p-4 focus:outline-none [&_h2]:mt-6 [&_h2]:text-2xl [&_h3]:mt-5 [&_h3]:text-xl [&_p]:my-3",
      },
    },
  });

  async function upload(file: File, purpose: "ARTICLE_COVER" | "ARTICLE_CONTENT") {
    const presign = await fetch("/api/captain/media/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        purpose,
      }),
    });
    const intent = await presign.json();
    if (!presign.ok) throw new Error(intent.message || "创建上传任务失败");
    const uploaded = await fetch(intent.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploaded.ok) throw new Error("图片上传失败");
    const completed = await fetch("/api/captain/media/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: intent.data.asset.id }),
    });
    const result = await completed.json();
    if (!completed.ok) throw new Error(result.message || "图片校验失败");
    return result.data;
  }

  async function handleImage(file: File, purpose: "ARTICLE_COVER" | "ARTICLE_CONTENT") {
    setBusy(true);
    try {
      const asset = await upload(file, purpose);
      if (purpose === "ARTICLE_COVER") {
        setCoverAssetId(asset.id);
      } else {
        const alt = window.prompt("请输入图片替代文本（必填）")?.trim();
        if (!alt) throw new Error("必须填写图片替代文本");
        editor
          ?.chain()
          .focus()
          .setImage({ src: `/api/media/${asset.storageKey}`, alt })
          .run();
      }
      toast.success("图片上传成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setBusy(false);
    }
  }

  function setLink() {
    const href = window.prompt("请输入链接地址")?.trim();
    if (!href) return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  async function save() {
    if (!editor) return;
    setBusy(true);
    try {
      const response = await fetch(
        initial ? `/api/captain/articles/${initial.id}` : "/api/captain/articles",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            subtitle: subtitle || null,
            summary,
            contentJson: editor.getJSON(),
            coverAssetId,
            ...(initial ? { version: initial.version } : {}),
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "保存失败");
      toast.success("草稿已保存");
      router.push(`/captain/articles/${body.data.id}/edit`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">标题</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subtitle">副标题</Label>
          <Input
            id="subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={180}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">摘要</Label>
          <Textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={300}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          粗体
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          斜体
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          二级标题
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          列表
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={setLink}>
          链接
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          render={<label htmlFor="content-image" />}
        >
          正文图片
        </Button>
        <input
          id="content-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImage(file, "ARTICLE_CONTENT");
          }}
        />
      </div>
      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" render={<label htmlFor="cover-image" />}>
          {coverAssetId ? "更换封面" : "上传封面"}
        </Button>
        <input
          id="cover-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImage(file, "ARTICLE_COVER");
          }}
        />
        {coverAssetId && <span className="text-muted-foreground text-sm">封面已就绪</span>}
        <Button onClick={() => void save()} disabled={busy || !editor}>
          {busy ? "保存中…" : "保存草稿"}
        </Button>
      </div>
    </div>
  );
}
