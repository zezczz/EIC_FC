import { describe, expect, it } from "vitest";
import { normalizeArticleSlug, slugifyTitle } from "@/server/articles/slug";

describe("normalizeArticleSlug", () => {
  it("normalizes Chinese slugs consistently with slugifyTitle", () => {
    const title = "本地验证测试新闻-2";
    expect(normalizeArticleSlug(title)).toBe(slugifyTitle(title));
    expect(normalizeArticleSlug(encodeURIComponent(title))).toBe(slugifyTitle(title));
  });

  it("normalizes ASCII slugs to lowercase", () => {
    expect(normalizeArticleSlug("Welcome-To-EIC-FC")).toBe("welcome-to-eic-fc");
    expect(normalizeArticleSlug(encodeURIComponent("Welcome-To-EIC-FC"))).toBe("welcome-to-eic-fc");
  });

  it("trims whitespace and applies NFKC", () => {
    expect(normalizeArticleSlug("  本地验证测试新闻  ")).toBe("本地验证测试新闻");
  });

  it("keeps invalid percent-encoding without throwing", () => {
    expect(normalizeArticleSlug("%E0%A4%A")).toBe("%e0%a4%a");
  });
});
