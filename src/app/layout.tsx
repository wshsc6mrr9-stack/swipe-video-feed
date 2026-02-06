// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://swipe-video-feed.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: "アダルトショート動画 | Swipe Video Feed",
  description:
    "スワイプでアダルトショート動画を連続視聴。毎日更新の大人向けショート動画サイト。",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: siteUrl,
  },

  openGraph: {
    title: "アダルトショート動画 | Swipe Video Feed",
    description:
      "スワイプでアダルトショート動画を連続視聴。毎日更新の大人向けショート動画サイト。",
    url: siteUrl,
    siteName: "Swipe Video Feed",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Swipe Video Feed",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "アダルトショート動画 | Swipe Video Feed",
    description:
      "スワイプでアダルトショート動画を連続視聴。毎日更新の大人向けショート動画サイト。",
    images: ["/twitter-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      {/* ✅ 全ページを overflow-hidden にすると /genre などがスクロール不能になるので外す */}
      {/* ✅ “指に付いてくる”抑止は overscroll-none だけ残す */}
      <body className="overscroll-none">{children}</body>
    </html>
  );
}
