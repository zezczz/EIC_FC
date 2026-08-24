import { test, expect } from "@playwright/test";

test.describe("关键公开流程", () => {
  test("首页与健康检查可用", async ({ page, request }) => {
    const live = await request.get("/api/health/live");
    expect(live.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "绿茵随记" })).toBeVisible();
    await expect(page.getByRole("link", { name: "申请加入" })).toHaveCount(0);
    await expect(page.getByText("hust", { exact: false })).toHaveCount(0);
    await expect(page.getByText("官方网站")).toHaveCount(0);
  });

  test("注册页跳转到登录", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
  });

  test("未登录不能访问动态、球队与公开注册接口", async ({ page, request }) => {
    await page.goto("/news");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/team");
    await expect(page).toHaveURL(/\/login/);

    const register = await request.post("/api/auth/register", {
      data: {
        username: "player01",
        displayName: "球员",
        password: "player-password",
        confirmPassword: "player-password",
      },
      headers: { Origin: "http://localhost:3000" },
    });
    expect(register.status()).toBe(403);

    const articles = await request.get("/api/articles");
    expect(articles.status()).toBe(401);

    const team = await request.get("/api/team");
    expect(team.status()).toBe(401);
  });

  test("登录页可打开", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
  });

  test("搜索引擎视角只看到首页", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const sitemapText = await sitemap.text();
    expect(sitemapText).not.toContain("/news");
    expect(sitemapText).not.toContain("/team");

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toContain("Disallow: /news/");
    expect(robotsText).not.toContain("Allow: /news/");
  });
});
