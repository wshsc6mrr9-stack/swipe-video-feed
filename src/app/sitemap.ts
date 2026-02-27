import type { MetadataRoute } from "next";
import { GENRE_SEO_MAP, GENRE_SLUGS } from "@/lib/genres";

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
  // 現在のサイトは日本語URLではなく、seiso などの「英語スラッグ」で動いているため、
  // GENRE_SLUGS の値（英語）を抽出します。
  const slugList = Object.values(GENRE_SLUGS || {});

  const genrePages: MetadataRoute.Sitemap = Array.from(
    new Set(slugList.map((s) => String(s).trim().toLowerCase()))
  ).map((slug) => ({
    // ここで encodeURIComponent(slug) を使うことで、安全なURLを生成します
    url: `${base}/genre/${encodeURIComponent(slug)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticPages, ...genrePages];
}