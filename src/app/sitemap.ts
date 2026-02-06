// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { GENRE_SEO_MAP } from "@/lib/genres";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://swipe-video-feed.vercel.app";
  const now = new Date();

  // ✅ 固定ページ
  const routes = [
    "/",
    "/adult-short-videos",
    "/genre",
    "/info",
    "/about",
    "/privacy",
    "/terms",
    "/contact",
  ];

  const staticPages: MetadataRoute.Sitemap = routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority:
      path === "/"
        ? 1
        : path === "/adult-short-videos"
          ? 0.9
          : path === "/genre"
            ? 0.8
            : 0.6,
  }));

  // ✅ /genre/[slug] を全部追加
  const genrePages: MetadataRoute.Sitemap = Object.keys(GENRE_SEO_MAP || {})
    .map((slug) => String(slug).trim().toLowerCase())
    .filter(Boolean)
    .map((slug) => ({
      url: `${base}/genre/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    }));

  return [...staticPages, ...genrePages];
}
