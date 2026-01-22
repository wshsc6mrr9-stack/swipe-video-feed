// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const siteUrl = "https://swipe-video-feed.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
