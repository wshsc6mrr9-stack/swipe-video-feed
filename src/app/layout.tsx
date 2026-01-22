import "./globals.css";
import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Swipe Video Feed",
    template: "%s | Swipe Video Feed",
  },
  description: "縦スワイプでショート動画を連続視聴できるフィード。",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Swipe Video Feed",
    description: "縦スワイプでショート動画を連続視聴できるフィード。",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Swipe Video Feed",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Swipe Video Feed",
    description: "縦スワイプでショート動画を連続視聴できるフィード。",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-[100svh] bg-black text-white">{children}</body>
    </html>
  );
}
