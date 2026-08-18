"use client";

import { useRef, useState } from "react";
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
import { assertExternalHttpsUrl } from "@/lib/external-image";
import { MarkdownImportError, markdownToTiptapDocument } from "@/lib/markdown-to-tiptap";

type InitialArticle = {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string;
  contentJson: unknown;
  coverUrl: string | null;
  coverAssetId: string | null;
  version: number;
};

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function ArticleEditor({ initial }: { initial?: InitialArticle }) {
  const router = useRouter();
  const markdownInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [busy, setBusy] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
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

  function insertHostedImage() {
    const src = window.prompt("请输入外部图床图片 URL（https://）")?.trim();
    if (!src) return;
    try {
      assertExternalHttpsUrl(src, "图片链接");
      const alt = window.prompt("请输入图片替代文本（必填）")?.trim();
      if (!alt) throw new Error("必须填写图片替代文本");
      editor?.chain().focus().setImage({ src, alt }).run();
      toast.success("图片已插入");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "图片插入失败");
    }
  }

  async function importMarkdown(file: File) {
    setBusy(true);
    try {
      const markdown = await file.text();
      const document = markdownToTiptapDocument(markdown);
      editor?.commands.setContent(document);
      toast.success("Markdown 已导入");
    } catch (error) {
      toast.error(error instanceof MarkdownImportError ? error.message : "Markdown 导入失败");
    } finally {
      setBusy(false);
      if (markdownInputRef.current) markdownInputRef.current.value = "";
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
      const normalizedCoverUrl = coverUrl.trim();
      if (normalizedCoverUrl) assertExternalHttpsUrl(normalizedCoverUrl, "封面链接");

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
            ...(normalizedCoverUrl
              ? { coverUrl: normalizedCoverUrl, coverAssetId: null }
              : initial?.coverAssetId
                ? {}
                : { coverUrl: null, coverAssetId: null }),
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
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Markdown 与图片说明</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>支持导入 `.md` 文件，正文会转换为编辑器内容。</li>
          <li>封面和正文图片请先上传到外部图床，再粘贴公开可访问的 `https://` 链接。</li>
          <li>本站不会保存文章图片，本地路径、HTTP 或 base64 图片都会被拒绝。</li>
          <li>每张图片都需要填写替代文本（alt）。</li>
        </ul>
      </div>

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
        <div className="space-y-2">
          <Label htmlFor="coverUrl">封面图床 URL</Label>
          <Input
            id="coverUrl"
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://example.com/cover.jpg"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          render={<label htmlFor="markdown-import" />}
        >
          导入 Markdown
        </Button>
        <input
          ref={markdownInputRef}
          id="markdown-import"
          type="file"
          accept=".md,text/markdown,text/plain"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importMarkdown(file);
          }}
        />
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
        <Button type="button" size="sm" variant="outline" onClick={insertHostedImage}>
          插入图床图片
        </Button>
      </div>
      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center gap-3">
        {coverUrl.trim() && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl.trim()}
            alt="封面预览"
            className="h-24 w-40 rounded-md border object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        <Button onClick={() => void save()} disabled={busy || !editor}>
          {busy ? "保存中…" : "保存草稿"}
        </Button>
      </div>
    </div>
  );
}
