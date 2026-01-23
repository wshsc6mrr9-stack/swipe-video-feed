import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://swipe-video-feed.vercel.app";

  const routes = ["/", "/info", "/about", "/privacy", "/terms", "/contact"];

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: path === "/" ? 1 : 0.6,
  }));
}
