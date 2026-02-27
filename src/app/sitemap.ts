import type { MetadataRoute } from "next";
import { GENRE_SLUGS } from "@/lib/genres";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://swipe-video-feed.vercel.app")
    .trim()
    .replace(/\/+$/, "");

  const now = new Date();

  // ---- 静的ページ ----
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

  // ---- ジャンルページ（GENRE_SLUGS 連動） ----
  // 実際にページが動作する「英語スラッグ」のリストを取得します
  const slugList = Object.values(GENRE_SLUGS || {});

  const genrePages: MetadataRoute.Sitemap = Array.from(
    new Set(slugList.map((s) => String(s).trim().toLowerCase()))
  ).map((slug) => ({
    // 英語スラッグを使用し、404にならない正しいURLを生成します
    url: `${base}/genre/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticPages, ...genrePages];
}