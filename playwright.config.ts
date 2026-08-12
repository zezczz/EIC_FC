import { defineConfig, devices } from "@playwright/test";

/**
 * E2E 配置（ARCHITECTURE.md 第 22.3 章）。
 * 需要先启动开发栈：pnpm docker:dev:up && pnpm dev
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/api/health/live",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
