import MarkdownIt from "markdown-it";
import type { TiptapNode } from "@/schemas/articles";
import { isAllowedArticleImageSrc, isExternalHttpsUrl } from "@/lib/external-image";
import { isTextColorToken, type TextColorToken } from "@/lib/text-colors";

type MdToken = {
  type: string;
  tag: string;
  content: string;
  markup: string;
  children?: MdToken[] | null;
  attrGet(name: string): string | null;
};

export class MarkdownImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkdownImportError";
  }
}

const md = new MarkdownIt("commonmark", {
  html: false,
  linkify: true,
  breaks: false,
});

type InlineContext = {
  marks: NonNullable<TiptapNode["marks"]>;
};

type MarkType = NonNullable<TiptapNode["marks"]>[number]["type"];

function collectNodeTypes(node: TiptapNode, types: Record<string, number> = {}) {
  types[node.type] = (types[node.type] ?? 0) + 1;
  for (const mark of node.marks ?? []) {
    const key = `mark:${mark.type}`;
    types[key] = (types[key] ?? 0) + 1;
  }
  for (const child of node.content ?? []) collectNodeTypes(child, types);
  return types;
}

export function markdownToTiptapDocument(markdown: string): TiptapNode {
  const tokens = md.parse(markdown, {}) as MdToken[];
  const content: TiptapNode[] = [];
  const skippedBlockTypes: string[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    switch (token.type) {
      case "heading_open": {
        const level = Number(token.tag.replace("h", ""));
        const inline = readInlineBlock(tokens, i + 1);
        i = inline.nextIndex - 1;
        content.push({
          type: "heading",
          attrs: { level: level === 3 || level === 4 ? level : 2 },
          content: inline.nodes,
        });
        break;
      }
      case "paragraph_open": {
        const inline = readInlineBlock(tokens, i + 1);
        i = inline.nextIndex - 1;
        if (inline.nodes.length > 0) {
          content.push({ type: "paragraph", content: inline.nodes });
        }
        break;
      }
      case "bullet_list_open": {
        const parsed = readList(tokens, i, "bulletList");
        content.push(parsed.node);
        i = parsed.nextIndex;
        break;
      }
      case "ordered_list_open": {
        const parsed = readList(tokens, i, "orderedList");
        content.push(parsed.node);
        i = parsed.nextIndex;
        break;
      }
      case "blockquote_open": {
        const parsed = readBlockquote(tokens, i);
        content.push(parsed.node);
        i = parsed.nextIndex;
        break;
      }
      case "fence":
      case "code_block":
        content.push({
          type: "codeBlock",
          content: token.content ? [{ type: "text", text: token.content.replace(/\n$/, "") }] : [],
        });
        break;
      case "hr":
        content.push({ type: "horizontalRule" });
        break;
      default:
        if (
          !token.type.endsWith("_close") &&
          token.type !== "inline" &&
          token.type !== "heading_close"
        ) {
          skippedBlockTypes.push(token.type);
        }
        break;
    }
  }

  const doc = {
    type: "doc" as const,
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
  // #region agent log
  fetch("http://127.0.0.1:7823/ingest/15b457dd-d67a-4b41-84e7-d9f6e9f0d820", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2f8dd4" },
    body: JSON.stringify({
      sessionId: "2f8dd4",
      hypothesisId: "F",
      location: "markdown-to-tiptap.ts:markdownToTiptapDocument",
      message: "markdown converted",
      data: {
        mdLen: markdown.length,
        hasBOM: markdown.charCodeAt(0) === 0xfeff,
        hasCRLF: markdown.includes("\r\n"),
        tokenTypes: [...new Set(tokens.map((token) => token.type))],
        skippedBlockTypes: [...new Set(skippedBlockTypes)],
        nodeTypes: collectNodeTypes(doc),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return doc;
}

function readInlineBlock(tokens: MdToken[], start: number) {
  const token = tokens[start];
  if (token?.type === "inline") {
    const nodes = readInlineTokens(token.children ?? [], { marks: [] });
    return { nodes, nextIndex: start + 2 };
  }

  const nodes: TiptapNode[] = [];
  let i = start;
  while (
    i < tokens.length &&
    tokens[i].type !== "paragraph_close" &&
    tokens[i].type !== "heading_close"
  ) {
    if (tokens[i].type === "inline") {
      nodes.push(...readInlineTokens(tokens[i].children ?? [], { marks: [] }));
      i += 1;
      continue;
    }
    const parsed = readInlineToken(tokens, i, { marks: [] });
    nodes.push(...parsed.nodes);
    i = parsed.nextIndex;
  }
  return { nodes, nextIndex: i + 1 };
}

function readInlineTokens(tokens: MdToken[], context: InlineContext): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  for (let i = 0; i < tokens.length;) {
    const parsed = readInlineToken(tokens, i, context);
    nodes.push(...parsed.nodes);
    i = parsed.nextIndex;
  }
  return nodes;
}

function readInlineToken(
  tokens: MdToken[],
  index: number,
  context: InlineContext,
): { nodes: TiptapNode[]; nextIndex: number } {
  const token = tokens[index];
  if (!token) return { nodes: [], nextIndex: index };

  if (token.type === "text") {
    if (!token.content) return { nodes: [], nextIndex: index + 1 };
    return {
      nodes: expandColoredText(token.content, context.marks),
      nextIndex: index + 1,
    };
  }

  if (token.type === "softbreak" || token.type === "hardbreak") {
    return { nodes: [{ type: "hardBreak" }], nextIndex: index + 1 };
  }

  if (token.type === "code_inline") {
    return {
      nodes: [
        {
          type: "text",
          text: token.content,
          ...(context.marks.length ? { marks: [...context.marks] } : {}),
        },
      ],
      nextIndex: index + 1,
    };
  }

  if (token.type === "image") {
    const src = token.attrGet("src") ?? "";
    const alt = (token.content || token.attrGet("alt") || "").trim();
    const title = token.attrGet("title") ?? undefined;
    validateMarkdownImage(src, alt, token.markup);
    return {
      nodes: [
        {
          type: "image",
          attrs: {
            src: src.trim(),
            alt,
            ...(title ? { title } : {}),
          },
        },
      ],
      nextIndex: index + 1,
    };
  }

  const markMap: Record<string, MarkType> = {
    strong_open: "bold",
    em_open: "italic",
    s_open: "strike",
  };

  if (token.type in markMap) {
    const markType = markMap[token.type];
    const closeType = token.type.replace("_open", "_close");
    const nextMarks = [...context.marks, { type: markType }];
    const nodes: TiptapNode[] = [];
    let i = index + 1;
    while (i < tokens.length && tokens[i].type !== closeType) {
      const parsed = readInlineToken(tokens, i, { marks: nextMarks });
      nodes.push(...parsed.nodes);
      i = parsed.nextIndex;
    }
    return { nodes, nextIndex: i + 1 };
  }

  if (token.type === "link_open") {
    const href = token.attrGet("href") ?? "";
    if (!/^(https?:|mailto:|\/|#)/i.test(href) || /^javascript:/i.test(href)) {
      // #region agent log
      fetch("http://127.0.0.1:7823/ingest/15b457dd-d67a-4b41-84e7-d9f6e9f0d820", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2f8dd4" },
        body: JSON.stringify({
          sessionId: "2f8dd4",
          hypothesisId: "C",
          location: "markdown-to-tiptap.ts:link_open",
          message: "rejected link href",
          data: { href: href.slice(0, 80) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      throw new MarkdownImportError(`不支持的链接地址：${href}`);
    }
    const nextMarks: NonNullable<TiptapNode["marks"]> = [
      ...context.marks,
      { type: "link", attrs: { href } },
    ];
    const nodes: TiptapNode[] = [];
    let i = index + 1;
    while (i < tokens.length && tokens[i].type !== "link_close") {
      const parsed = readInlineToken(tokens, i, { marks: nextMarks });
      nodes.push(...parsed.nodes);
      i = parsed.nextIndex;
    }
    return { nodes, nextIndex: i + 1 };
  }

  return { nodes: [], nextIndex: index + 1 };
}

function readList(tokens: MdToken[], start: number, type: "bulletList" | "orderedList") {
  const items: TiptapNode[] = [];
  let i = start + 1;
  const closeType = type === "bulletList" ? "bullet_list_close" : "ordered_list_close";

  while (i < tokens.length && tokens[i].type !== closeType) {
    if (tokens[i].type === "list_item_open") {
      const itemContent: TiptapNode[] = [];
      i += 1;
      while (i < tokens.length && tokens[i].type !== "list_item_close") {
        if (tokens[i].type === "paragraph_open") {
          const inline = readInlineBlock(tokens, i + 1);
          if (inline.nodes.length > 0)
            itemContent.push({ type: "paragraph", content: inline.nodes });
          i = inline.nextIndex;
          continue;
        }
        if (tokens[i].type === "bullet_list_open" || tokens[i].type === "ordered_list_open") {
          const nested = readList(
            tokens,
            i,
            tokens[i].type === "bullet_list_open" ? "bulletList" : "orderedList",
          );
          itemContent.push(nested.node);
          i = nested.nextIndex + 1;
          continue;
        }
        i += 1;
      }
      items.push({
        type: "listItem",
        content: itemContent.length > 0 ? itemContent : [{ type: "paragraph" }],
      });
    }
    i += 1;
  }

  return {
    node: { type, content: items },
    nextIndex: i,
  };
}

function readBlockquote(tokens: MdToken[], start: number) {
  const content: TiptapNode[] = [];
  let i = start + 1;
  while (i < tokens.length && tokens[i].type !== "blockquote_close") {
    if (tokens[i].type === "paragraph_open") {
      const inline = readInlineBlock(tokens, i + 1);
      if (inline.nodes.length > 0) content.push({ type: "paragraph", content: inline.nodes });
      i = inline.nextIndex;
      continue;
    }
    i += 1;
  }
  return {
    node: {
      type: "blockquote",
      content: content.length > 0 ? content : [{ type: "paragraph" }],
    },
    nextIndex: i,
  };
}

function textNode(text: string, marks: NonNullable<TiptapNode["marks"]>): TiptapNode {
  return {
    type: "text",
    text,
    ...(marks.length ? { marks: [...marks] } : {}),
  };
}

function expandColoredText(
  text: string,
  baseMarks: NonNullable<TiptapNode["marks"]>,
): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  let buffer = "";
  let color: TextColorToken | null = null;
  let i = 0;

  const flush = () => {
    if (!buffer) return;
    const marks = color
      ? [...baseMarks, { type: "textColor" as const, attrs: { color } }]
      : baseMarks;
    nodes.push(textNode(buffer, marks));
    buffer = "";
  };

  while (i < text.length) {
    if (text[i] === "{") {
      const closeOpen = text.startsWith("{/", i);
      const tagMatch = text.slice(i).match(closeOpen ? /^{\/([a-z]+)}/ : /^{([a-z]+)}/);
      if (tagMatch) {
        const token = tagMatch[1];
        if (!isTextColorToken(token)) {
          throw new MarkdownImportError(`不支持的文字颜色：${token}`);
        }
        if (closeOpen) {
          if (color !== token) {
            throw new MarkdownImportError(
              color
                ? `颜色标签不匹配：当前是 {${color}}，却关闭了 {/${token}}`
                : `多余的结束标签 {/${token}}`,
            );
          }
          flush();
          color = null;
        } else {
          if (color) {
            throw new MarkdownImportError("不支持嵌套的颜色标签");
          }
          flush();
          color = token;
        }
        i += tagMatch[0].length;
        continue;
      }
    }
    buffer += text[i];
    i += 1;
  }

  if (color) {
    throw new MarkdownImportError(`颜色标签未闭合：{${color}}`);
  }
  flush();
  return nodes;
}

function validateMarkdownImage(src: string, alt: string, markup: string) {
  const trimmed = src.trim();
  if (!trimmed) {
    throw new MarkdownImportError("图片地址不能为空");
  }
  if (/^(data:|javascript:|file:|\/\/)/i.test(trimmed) || /^\.{0,2}\//.test(trimmed)) {
    throw new MarkdownImportError(
      `图片 ${markup} 使用了本地或不安全地址。请先将图片上传到外部图床，并使用 https:// 链接。`,
    );
  }
  if (!isExternalHttpsUrl(trimmed)) {
    throw new MarkdownImportError(`图片 ${markup} 必须使用公开可访问的 https:// 图床链接。`);
  }
  if (!alt) {
    throw new MarkdownImportError(`图片 ${markup} 缺少替代文本（alt）。`);
  }
  if (!isAllowedArticleImageSrc(trimmed)) {
    throw new MarkdownImportError(`图片 ${markup} 地址无效。`);
  }
}

export function validateArticleImageNode(node: TiptapNode, path = "正文"): void {
  if (node.type === "image") {
    const src = typeof node.attrs?.src === "string" ? node.attrs.src.trim() : "";
    const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.trim() : "";
    if (!isAllowedArticleImageSrc(src) || !alt) {
      throw new Error(`${path}图片必须使用 https:// 图床链接并填写替代文本`);
    }
  }
  for (const child of node.content ?? []) {
    validateArticleImageNode(child, path);
  }
}
