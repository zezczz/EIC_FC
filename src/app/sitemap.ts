import type { MetadataRoute } from "next";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: env.APP_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
