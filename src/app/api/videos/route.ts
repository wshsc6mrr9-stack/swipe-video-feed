export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { listVideos, addVideo } from "@/lib/videosStore"; // addVideoを追加
import { revalidatePath } from "next/cache";

// 動画一覧を取得する処理 (GET)
export async function GET() {
  try {
    const items = await listVideos();
    return NextResponse.json(
      { ok: true, items },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "LIST_FAILED" },
      { status: 500 }
    );
  }
}

// 動画を追加する処理 (POST) ← これが足りなかった！
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");

    // パスワードチェック
    if (!process.env.ADMIN_PASSWORD || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const newVideo = await addVideo(body);

    // 画面を更新させる
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/api/videos");

    return NextResponse.json({
      ok: true,
      inserted: newVideo ? 1 : 0,
      video: newVideo,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "POST_FAILED" },
      { status: 500 }
    );
  }
}