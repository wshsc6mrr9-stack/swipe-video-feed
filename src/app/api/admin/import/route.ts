export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { addVideo } from "@/lib/videosStore";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");

    if (!process.env.ADMIN_PASSWORD || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // システム本来の保存ルール（addVideo）に投げる
    const newVideo = await addVideo(body);

    // キャッシュを強制破棄
    revalidatePath("/");
    revalidatePath("/api/videos");

    return NextResponse.json({ ok: true, inserted: 1, video: newVideo });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}