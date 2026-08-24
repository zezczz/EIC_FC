import type { NextConfig } from "next";

/**
 * Next.js 配置（ARCHITECTURE.md §19.1）。
 * standalone 输出用于 Docker 多阶段构建。
 */
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    staticGenerationMaxConcurrency: 1,
    cpus: 1,
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
