// src/app/api/image/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("URL parameter is missing", { status: 400 });
  }

  try {
    // Vercelが「普通のブラウザ」のフリをしてFanzaから画像をダウンロードする
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://www.dmm.co.jp/", // Fanzaを安心させる魔法のヘッダー
      },
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch image", { status: response.status });
    }

    const buffer = await response.arrayBuffer();

    // ダウンロードした画像を、X（Twitter）に渡す
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400", // 1日キャッシュして高速化
      },
    });
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
