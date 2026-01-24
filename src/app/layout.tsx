// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://swipe-video-feed.vercel.app";

// ここだけ毎回変える（例: 0124 → 0125）
const BUILD = "0124";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  // ✅ 検索で見せたい名前
  title: {
    default: "アダルトショート動画 | Swipe Video Feed",
    template: "%s | Swipe Video Feed",
  },
  description:
    "縦スワイプでアダルトショート動画を連続視聴できるフィード。18歳以上のみ閲覧可能。",

  // ✅ canonical（重複URL対策）
  alternates: {
    canonical: siteUrl + "/",
  },

  // ✅ robots（インデックス許可）
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    title: "アダルトショート動画 | Swipe Video Feed",
    description:
      "縦スワイプでアダルトショート動画を連続視聴できるフィード。18歳以上のみ閲覧可能。",
    url: siteUrl,
    siteName: "Swipe Video Feed",
    type: "website",
    images: [
      {
        // ✅ ここは君の既存のOG生成ルートを維持（BUILDでキャッシュ回避）
        url: `/opengraph-image?b=${BUILD}`,
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
      "縦スワイプでアダルトショート動画を連続視聴できるフィード。18歳以上のみ閲覧可能。",
    images: [`/twitter-image?b=${BUILD}`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      {/* iPhoneで“ページごと指に付いてくる”のを止める */}
      <body className="overflow-hidden overscroll-none">{children}</body>
    </html>
  );
}
