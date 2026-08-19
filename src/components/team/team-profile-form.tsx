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
import { TextColor } from "@/components/article/text-color";
import { MarkdownImportError, markdownToTiptapDocument } from "@/lib/markdown-to-tiptap";
import { TEXT_COLOR_LABELS, TEXT_COLOR_TOKENS } from "@/lib/text-colors";

type TeamImage = { assetId: string; caption: string | null; url: string | null };

type InitialTeam = {
  name: string;
  subtitle: string | null;
  contact: string | null;
  honors: string;
  summary: string;
  contentJson: unknown;
  crestAssetId: string | null;
  crestUrl: string | null;
  version: number;
  images: TeamImage[];
};

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

async function uploadTeamImage(file: File, purpose: "TEAM_CREST" | "TEAM_GALLERY") {
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
  const presignBody = await presign.json();
  if (!presign.ok) throw new Error(presignBody.message || "上传初始化失败");
  const put = await fetch(presignBody.data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error("上传失败");
  const complete = await fetch("/api/captain/media/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: presignBody.data.asset.id }),
  });
  const completeBody = await complete.json();
  if (!complete.ok) throw new Error(completeBody.message || "上传确认失败");
  return {
    id: presignBody.data.asset.id as string,
    url: `/api/media/${completeBody.data.storageKey}`,
  };
}

export function TeamProfileForm({ initial }: { initial: InitialTeam }) {
  const router = useRouter();
  const markdownInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.name);
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? "");
  const [contact, setContact] = useState(initial.contact ?? "");
  const [honors, setHonors] = useState(initial.honors);
  const [summary, setSummary] = useState(initial.summary);
  const [crestAssetId, setCrestAssetId] = useState<string | null>(initial.crestAssetId);
  const [crestUrl, setCrestUrl] = useState<string | null>(initial.crestUrl);
  const [images, setImages] = useState<TeamImage[]>(initial.images);
  const [busy, setBusy] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      ImageExtension.configure({ allowBase64: false }),
      TextColor,
    ],
    content: initial.contentJson ?? EMPTY_DOC,
    editorProps: {
      attributes: {
        class: "min-h-56 rounded-lg border bg-background p-4 focus:outline-none [&_p]:my-3",
      },
    },
  });

  async function importMarkdown(file: File) {
    setBusy(true);
    try {
      const markdown = await file.text();
      // #region agent log
      fetch("http://127.0.0.1:7823/ingest/15b457dd-d67a-4b41-84e7-d9f6e9f0d820", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2f8dd4" },
        body: JSON.stringify({
          sessionId: "2f8dd4",
          hypothesisId: "D",
          location: "team-profile-form.tsx:importMarkdown",
          message: "import start",
          data: {
            fileName: file.name,
            size: file.size,
            editorReady: Boolean(editor),
            mdLen: markdown.length,
            hasColorTag: /\{(red|orange|green|blue|purple)\}/.test(markdown),
            hasMdImage: /!\[[^\]]*\]\(/.test(markdown),
            hasMdLink: /\[[^\]]+\]\(/.test(markdown),
            hasUrl: /https?:\/\//i.test(markdown),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const document = markdownToTiptapDocument(markdown);
      if (!editor) {
        // #region agent log
        fetch("http://127.0.0.1:7823/ingest/15b457dd-d67a-4b41-84e7-d9f6e9f0d820", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2f8dd4" },
          body: JSON.stringify({
            sessionId: "2f8dd4",
            hypothesisId: "D",
            location: "team-profile-form.tsx:importMarkdown",
            message: "editor missing",
            data: {},
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      }
      editor?.commands.setContent(document);
      // #region agent log
      fetch("http://127.0.0.1:7823/ingest/15b457dd-d67a-4b41-84e7-d9f6e9f0d820", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2f8dd4" },
        body: JSON.stringify({
          sessionId: "2f8dd4",
          hypothesisId: "A",
          location: "team-profile-form.tsx:importMarkdown",
          message: "setContent ok",
          data: {
            hasLinkMark: Boolean(editor?.schema.marks.link),
            hasImageNode: Boolean(editor?.schema.nodes.image),
            jsonTypes: editor?.getJSON()?.content?.map((node) => node.type) ?? [],
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      toast.success("Markdown 已导入");
    } catch (error) {
      // #region agent log
      fetch("http://127.0.0.1:7823/ingest/15b457dd-d67a-4b41-84e7-d9f6e9f0d820", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2f8dd4" },
        body: JSON.stringify({
          sessionId: "2f8dd4",
          hypothesisId: "A",
          location: "team-profile-form.tsx:importMarkdown",
          message: "import error",
          data: {
            name: error instanceof Error ? error.name : typeof error,
            message: error instanceof Error ? error.message.slice(0, 200) : "unknown",
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      toast.error(error instanceof MarkdownImportError ? error.message : "Markdown 导入失败");
    } finally {
      setBusy(false);
      if (markdownInputRef.current) markdownInputRef.current.value = "";
    }
  }

  async function save() {
    if (!editor) return;
    setBusy(true);
    try {
      const res = await fetch("/api/captain/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subtitle: subtitle || null,
          contact: contact || null,
          honors,
          summary,
          contentJson: editor.getJSON(),
          crestAssetId,
          images: images.map((image) => ({ assetId: image.assetId, caption: image.caption })),
          version: initial.version,
        }),
      });
      const body = await res.json();
      // #region agent log
      fetch("http://127.0.0.1:7823/ingest/15b457dd-d67a-4b41-84e7-d9f6e9f0d820", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2f8dd4" },
        body: JSON.stringify({
          sessionId: "2f8dd4",
          hypothesisId: "E",
          location: "team-profile-form.tsx:save",
          message: "save response",
          data: {
            ok: res.ok,
            status: res.status,
            message: typeof body.message === "string" ? body.message.slice(0, 200) : null,
            fieldErrors: body.fieldErrors ?? null,
            jsonTypes: editor.getJSON()?.content?.map((node) => node.type) ?? [],
            markSample:
              editor
                .getJSON()
                ?.content?.flatMap((node) => node.content ?? [])
                .flatMap((node) => node.marks?.map((mark) => mark.type) ?? [])
                .slice(0, 12) ?? [],
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!res.ok) throw new Error(body.message || "保存失败");
      toast.success("球队信息已更新");
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
          <Label htmlFor="name">队名</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subtitle">副标题</Label>
          <Input
            id="subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact">联系方式</Label>
          <Input
            id="contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={300}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="honors">荣誉</Label>
          <Textarea
            id="honors"
            value={honors}
            onChange={(e) => setHonors(e.target.value)}
            rows={4}
            maxLength={2000}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">简介摘要</Label>
          <Textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="crest">队徽</Label>
          <Input
            id="crest"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void uploadTeamImage(file, "TEAM_CREST")
                .then((asset) => {
                  setCrestAssetId(asset.id);
                  setCrestUrl(asset.url);
                })
                .catch((error) => toast.error(error instanceof Error ? error.message : "上传失败"));
            }}
          />
          {crestUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={crestUrl}
              alt="队徽预览"
              className="h-24 w-24 rounded-md border object-cover"
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="gallery">球队图片</Label>
          <Input
            id="gallery"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void uploadTeamImage(file, "TEAM_GALLERY")
                .then((asset) => {
                  setImages((current) => [
                    ...current,
                    { assetId: asset.id, caption: "", url: asset.url },
                  ]);
                })
                .catch((error) => toast.error(error instanceof Error ? error.message : "上传失败"));
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((image, index) => (
              <div key={image.assetId} className="space-y-2 rounded-md border p-3">
                {image.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.url} alt="" className="h-32 w-full rounded object-cover" />
                ) : null}
                <Input
                  value={image.caption ?? ""}
                  placeholder="图片说明"
                  onChange={(e) =>
                    setImages((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, caption: e.target.value } : item,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  移除
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>球队简介</Label>
        <p className="text-muted-foreground text-sm">
          支持导入 Markdown。彩色字体语法：{"{red}红字{/red}"}、{"{orange}"}、{"{green}"}、
          {"{blue}"}、{"{purple}"}。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            render={<label htmlFor="team-md-import" />}
          >
            导入 Markdown
          </Button>
          <input
            ref={markdownInputRef}
            id="team-md-import"
            type="file"
            accept=".md,text/markdown,text/plain"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importMarkdown(file);
            }}
          />
          {TEXT_COLOR_TOKENS.map((color) => (
            <Button
              key={color}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => editor?.chain().focus().setTextColor(color).run()}
            >
              {TEXT_COLOR_LABELS[color]}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor?.chain().focus().unsetTextColor().run()}
          >
            清除颜色
          </Button>
        </div>
        <EditorContent editor={editor} />
      </div>

      <Button onClick={() => void save()} disabled={busy || !editor}>
        {busy ? "保存中…" : "保存球队信息"}
      </Button>
    </div>
  );
}
