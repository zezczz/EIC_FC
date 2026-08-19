import { describe, expect, it } from "vitest";
import { relayEntrySchema } from "@/schemas/relays";
import { MarkdownImportError, markdownToTiptapDocument } from "@/lib/markdown-to-tiptap";
import type { TiptapNode } from "@/schemas/articles";

describe("relayEntrySchema companion names", () => {
  it("requires companion names when participantCount > 1", () => {
    const result = relayEntrySchema.safeParse({
      response: "JOINED",
      participantCount: 3,
      companionNames: ["张三"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts matching companion names", () => {
    const result = relayEntrySchema.safeParse({
      response: "JOINED",
      participantCount: 3,
      companionNames: ["张三", "李四"],
    });
    expect(result.success).toBe(true);
  });
});

describe("markdownToTiptapDocument", () => {
  it("converts headings, lists and external images", () => {
    const doc = markdownToTiptapDocument(
      "## 标题\n\n- 项目一\n\n![球场](https://cdn.example.com/pitch.jpg)",
    );
    expect(doc.type).toBe("doc");
    expect(doc.content?.some((node) => node.type === "heading")).toBe(true);
    expect(doc.content?.some((node) => node.type === "bulletList")).toBe(true);
    const image = findNode(doc, "image");
    expect(image?.attrs?.src).toBe("https://cdn.example.com/pitch.jpg");
  });

  it("rejects local image paths", () => {
    expect(() => markdownToTiptapDocument("![本地](./images/a.jpg)")).toThrow(MarkdownImportError);
  });

  it("rejects http image urls", () => {
    expect(() => markdownToTiptapDocument("![图](http://cdn.example.com/a.jpg)")).toThrow(
      MarkdownImportError,
    );
  });

  it("converts preset color markers", () => {
    const doc = markdownToTiptapDocument("{red}红字{/red}普通{blue}蓝字{/blue}");
    const texts = (doc.content ?? []).flatMap((node) => node.content ?? []);
    const red = texts.find((node) => node.text === "红字");
    const blue = texts.find((node) => node.text === "蓝字");
    expect(red?.marks).toEqual([{ type: "textColor", attrs: { color: "red" } }]);
    expect(blue?.marks).toEqual([{ type: "textColor", attrs: { color: "blue" } }]);
  });

  it("rejects unknown or nested colors", () => {
    expect(() => markdownToTiptapDocument("{pink}x{/pink}")).toThrow(MarkdownImportError);
    expect(() => markdownToTiptapDocument("{red}{blue}x{/blue}{/red}")).toThrow(
      MarkdownImportError,
    );
    expect(() => markdownToTiptapDocument("{red}未闭合")).toThrow(MarkdownImportError);
  });
});

function findNode(node: TiptapNode, type: string): TiptapNode | null {
  if (node.type === type) return node;
  for (const child of node.content ?? []) {
    const found = findNode(child, type);
    if (found) return found;
  }
  return null;
}
