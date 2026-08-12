import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * 集成测试配置：需要真实 PostgreSQL（docker compose -f compose.dev.yml up -d）。
 * 通过 vitest 的 setup 文件在测试前执行 prisma migrate reset。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    globals: true,
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/setup-env.ts", "./tests/integration/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
