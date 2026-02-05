import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://swipe-video-feed.vercel.app";

  // ✅ 追加：/adult-short-videos と /genre
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

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: path === "/" ? 1 : path === "/adult-short-videos" ? 0.9 : path === "/genre" ? 0.8 : 0.6,
  }));
}
