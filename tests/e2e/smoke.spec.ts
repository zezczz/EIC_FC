import { test, expect } from "@playwright/test";

test.describe("关键公开流程", () => {
  test("首页与健康检查可用", async ({ page, request }) => {
    const live = await request.get("/api/health/live");
    expect(live.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "EIC FC" })).toBeVisible();
    await expect(page.getByRole("link", { name: "球队动态" })).toBeVisible();
  });

  test("注册页可打开", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /申请加入/ })).toBeVisible();
  });

  test("登录页可打开", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
  });
});
