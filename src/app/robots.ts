import type { MetadataRoute } from "next";
import { env } from "@/server/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/news/", "/team", "/team/", "/api/media/"],
      disallow: [
        "/api/",
        "/captain/",
        "/relay/",
        "/account/",
        "/members/",
        "/login",
        "/register",
        "/pending",
      ],
    },
    sitemap: `${env.APP_URL}/sitemap.xml`,
    host: env.APP_URL,
  };
}
