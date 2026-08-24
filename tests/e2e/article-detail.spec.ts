import { test, expect, type Page } from "@playwright/test";

const ORIGIN = "http://localhost:3000";
const CAPTAIN = {
  identity: "devcaptain",
  password: "dev-captain-password",
};

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "中文正文内容" }] }],
};

async function loginCaptain(page: Page) {
  const response = await page.request.post("/api/auth/callback/credentials", {
    data: CAPTAIN,
    headers: { Origin: ORIGIN },
  });
  return response.ok();
}

test.describe("动态详情页", () => {
  test("未登录访问动态列表会跳到登录页", async ({ page }) => {
    await page.goto("/news");
    await expect(page).toHaveURL(/\/login/);
  });

  test("中文标题发布后从列表进入详情", async ({ page }) => {
    const loggedIn = await loginCaptain(page);
    test.skip(!loggedIn, "开发队长账号不可用，请先执行 pnpm db:seed");

    const title = `本地验证测试新闻-${Date.now()}`;
    const createResponse = await page.request.post("/api/captain/articles", {
      data: {
        title,
        summary: "E2E 测试摘要",
        contentJson: EMPTY_DOC,
        coverUrl: null,
        coverAssetId: null,
      },
      headers: { Origin: ORIGIN },
    });
    expect(createResponse.ok()).toBeTruthy();
    const createBody = await createResponse.json();
    const articleId = createBody.data.id as string;

    const publishResponse = await page.request.post(`/api/captain/articles/${articleId}/publish`, {
      headers: { Origin: ORIGIN },
    });
    expect(publishResponse.ok()).toBeTruthy();

    await page.goto("/news");
    await page.getByRole("link", { name: title }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("页面不存在")).toHaveCount(0);
    await expect(page.getByText("中文正文内容")).toBeVisible();
  });
});
