import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { env } from "@/server/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await db.article.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, updatedAt: true },
  });
  return [
    {
      url: env.APP_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${env.APP_URL}/news`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${env.APP_URL}/team`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: `${env.APP_URL}/news/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
