// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { GENRE_SEO_MAP } from "@/lib/genres";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://swipe-video-feed.vercel.app")
    .trim()
    .replace(/\/+$/, "");

  const now = new Date();

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

  // ✅ GENRE_SEO_MAP が Object でも Map でも拾えるように
  const slugs: string[] =
    GENRE_SEO_MAP instanceof Map
      ? Array.from(GENRE_SEO_MAP.keys()).map((s) => String(s))
      : Object.keys(GENRE_SEO_MAP || {});

  const genrePages: MetadataRoute.Sitemap = slugs
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
