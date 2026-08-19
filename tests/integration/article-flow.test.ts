import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import {
  createArticle,
  getCaptainArticle,
  getPublicArticle,
  publishArticle,
} from "@/server/articles/service";
import { slugifyTitle, normalizeArticleSlug } from "@/server/articles/slug";

const ctx = {
  actorId: "",
  requestId: "article-test",
};

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "测试正文" }] }],
};

describe("article publish flow", () => {
  beforeAll(async () => {
    await db.article.deleteMany();
    await db.user.deleteMany();

    const passwordHash = await hashPassword("captain-password-1");
    const captain = await db.user.create({
      data: {
        username: "articlecaptain",
        usernameNormalized: "articlecaptain",
        email: "articlecaptain@example.com",
        emailNormalized: "articlecaptain@example.com",
        passwordHash,
        displayName: "动态队长",
        role: "CAPTAIN",
        status: "ACTIVE",
      },
    });
    ctx.actorId = captain.id;
  });

  it("keeps draft hidden from public until published", async () => {
    const article = await createArticle(
      {
        title: "草稿动态",
        subtitle: null,
        summary: "摘要",
        contentJson: EMPTY_DOC,
        coverUrl: null,
        coverAssetId: null,
      },
      ctx,
    );
    expect(article.status).toBe("DRAFT");

    const captainView = await getCaptainArticle(article.id);
    expect(captainView.title).toBe("草稿动态");

    await expect(getPublicArticle(article.slug)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    const published = await publishArticle(article.id, ctx);
    expect(published.status).toBe("PUBLISHED");

    const publicView = await getPublicArticle(article.slug);
    expect(publicView.title).toBe("草稿动态");
    expect(publicView.contentJson).toEqual(EMPTY_DOC);
  });

  it("publishes Chinese slug articles for public access", async () => {
    const title = "本地验证测试新闻";
    const article = await createArticle(
      {
        title,
        subtitle: null,
        summary: "中文 slug 测试摘要",
        contentJson: EMPTY_DOC,
        coverUrl: null,
        coverAssetId: null,
      },
      ctx,
    );

    expect(article.slug).toBe(slugifyTitle(title));
    await expect(getPublicArticle(article.slug)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    await publishArticle(article.id, ctx);

    const publicView = await getPublicArticle(article.slug);
    expect(publicView.title).toBe(title);
    expect(publicView.slug).toBe("本地验证测试新闻");

    const encodedSlug = encodeURIComponent(publicView.slug);
    const encodedView = await getPublicArticle(normalizeArticleSlug(encodedSlug));
    expect(encodedView.title).toBe(title);
  });
});
