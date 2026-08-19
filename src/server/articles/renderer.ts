import { articleContentSchema, type TiptapNode } from "@/schemas/articles";
import { isAllowedArticleImageSrc } from "@/lib/external-image";
import { isTextColorToken } from "@/lib/text-colors";
import { AppError } from "@/server/errors";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (/^(https?:|mailto:)/i.test(href) || href.startsWith("/") || href.startsWith("#")) {
    return href;
  }
  return null;
}

function renderMarks(text: string, node: TiptapNode): string {
  return (node.marks ?? []).reduce((html, mark) => {
    if (mark.type === "bold") return `<strong>${html}</strong>`;
    if (mark.type === "italic") return `<em>${html}</em>`;
    if (mark.type === "strike") return `<s>${html}</s>`;
    if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      return href ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${html}</a>` : html;
    }
    if (mark.type === "textColor") {
      const color = mark.attrs?.color;
      if (isTextColorToken(color)) {
        return `<span class="text-color-${color}">${html}</span>`;
      }
      return html;
    }
    return html;
  }, text);
}

function renderNode(node: TiptapNode, depth: number): string {
  if (depth > 30) {
    throw new AppError("VALIDATION_ERROR", "正文嵌套层级过深");
  }
  if (node.type === "text") return renderMarks(escapeHtml(node.text ?? ""), node);

  const children = (node.content ?? []).map((child) => renderNode(child, depth + 1)).join("");
  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading": {
      const level = Number(node.attrs?.level);
      const safeLevel = level === 3 || level === 4 ? level : 2;
      return `<h${safeLevel}>${children}</h${safeLevel}>`;
    }
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "horizontalRule":
      return "<hr>";
    case "hardBreak":
      return "<br>";
    case "caption":
      return `<figcaption>${children}</figcaption>`;
    case "codeBlock":
      return `<pre><code>${children}</code></pre>`;
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src.trim() : "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.trim() : "";
      const title = typeof node.attrs?.title === "string" ? node.attrs.title.trim() : "";
      if (!isAllowedArticleImageSrc(src) || !alt) {
        throw new AppError("VALIDATION_ERROR", "正文图片必须使用 https:// 图床链接并填写替代文本");
      }
      const extraAttrs = src.startsWith("https://")
        ? ' loading="lazy" referrerpolicy="no-referrer"'
        : ' loading="lazy"';
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${
        title ? ` title="${escapeHtml(title)}"` : ""
      }${extraAttrs}>`;
    }
    default:
      throw new AppError("VALIDATION_ERROR", `不支持的正文节点：${node.type}`);
  }
}

export function renderArticleContent(input: unknown): string {
  const document = articleContentSchema.parse(input);
  return renderNode(document, 0);
}

export function extractPlainText(input: unknown): string {
  const document = articleContentSchema.parse(input);
  const parts: string[] = [];
  const visit = (node: TiptapNode, depth: number) => {
    if (depth > 30) throw new AppError("VALIDATION_ERROR", "正文嵌套层级过深");
    if (node.type === "text" && node.text) parts.push(node.text);
    for (const child of node.content ?? []) visit(child, depth + 1);
    if (["paragraph", "heading", "listItem", "blockquote", "codeBlock"].includes(node.type)) {
      parts.push("\n");
    }
  };
  visit(document, 0);
  return parts
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
