import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://swipe-video-feed.vercel.app";

export const metadata: Metadata = {
  title: "Swipe Video Feed",
  description: "縦スワイプでショート動画を連続視聴できるフィード。",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Swipe Video Feed",
    description: "縦スワイプでショート動画を連続視聴できるフィード。",
    url: siteUrl,
    siteName: "Swipe Video Feed",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Swipe Video Feed" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Swipe Video Feed",
    description: "縦スワイプでショート動画を連続視聴できるフィード。",
    images: ["/twitter-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="overflow-hidden">{children}</body>
    </html>
  );
}
