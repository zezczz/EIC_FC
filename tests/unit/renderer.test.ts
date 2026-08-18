import { describe, expect, it } from "vitest";
import { renderArticleContent } from "@/server/articles/renderer";

describe("tiptap renderer", () => {
  it("渲染安全段落与加粗", () => {
    const html = renderArticleContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "EIC", marks: [{ type: "bold" }] },
          ],
        },
      ],
    });
    expect(html).toContain("<p>");
    expect(html).toContain("<strong>EIC</strong>");
  });

  it("渲染外部 https 图片", () => {
    const html = renderArticleContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: {
                src: "https://cdn.example.com/cover.jpg",
                alt: "封面",
              },
            },
          ],
        },
      ],
    });
    expect(html).toContain('src="https://cdn.example.com/cover.jpg"');
    expect(html).toContain('referrerpolicy="no-referrer"');
  });

  it("忽略 javascript: 链接而不输出 a 标签", () => {
    const html = renderArticleContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    });
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<a ");
  });

  it("转义 HTML 特殊字符", () => {
    const html = renderArticleContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "<script>alert(1)</script>" }],
        },
      ],
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("拒绝缺少 alt 的外部图片", () => {
    expect(() =>
      renderArticleContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "image",
                attrs: { src: "https://cdn.example.com/a.jpg", alt: "" },
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });
});
