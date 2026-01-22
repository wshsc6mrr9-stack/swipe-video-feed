// src/app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://swipe-video-feed.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Swipe Video Feed",
    template: "%s | Swipe Video Feed",
  },
  description: "縦スワイプでショート動画を連続視聴できるフィード。",
  applicationName: "Swipe Video Feed",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Swipe Video Feed",
    title: "Swipe Video Feed",
    description: "縦スワイプでショート動画を連続視聴できるフィード。",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Swipe Video Feed",
    description: "縦スワイプでショート動画を連続視聴できるフィード。",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-[100svh] bg-black text-white">{children}</body>
    </html>
  );
}
