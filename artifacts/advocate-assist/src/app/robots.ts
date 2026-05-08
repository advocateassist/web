import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/terms", "/founder", "/auth/signin", "/auth/signup"],
        disallow: ["/api/", "/onboarding", "/preview-dev/"],
      },
    ],
    sitemap: "https://advocateassist.ai/sitemap.xml",
  };
}
