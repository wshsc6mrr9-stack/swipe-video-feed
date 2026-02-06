import { NextResponse } from "next/server";
import { GENRE_SEO_MAP } from "@/lib/genres";

export async function GET() {
  const siteUrl = "https://swipe-video-feed.vercel.app";

  const urls = [
    `${siteUrl}/`,
    `${siteUrl}/adult-short-videos`,
    `${siteUrl}/genre`,
    ...Object.keys(GENRE_SEO_MAP).map(
      (slug) => `${siteUrl}/genre/${slug}`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `
  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
  )
  .join("")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
