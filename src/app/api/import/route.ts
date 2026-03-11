import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { addVideo } from "@/lib/videosStore";

export const runtime = "nodejs";

function toSafeNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");

    if (!process.env.IMPORT_TOKEN || token !== process.env.IMPORT_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      title,
      videoUrl,
      pageUrl,
      genres,
      affUrl,
      affLabel,
      source,
      duration,
      videoDuration,
      totalDuration,
      lengthSec,
      durationSec,
    } = body;

    if (!title || !videoUrl) {
      return NextResponse.json(
        { ok: false, error: "title or videoUrl missing" },
        { status: 400 }
      );
    }

    const normalizedDuration =
      toSafeNumber(duration) ??
      toSafeNumber(videoDuration) ??
      toSafeNumber(totalDuration) ??
      toSafeNumber(lengthSec) ??
      toSafeNumber(durationSec);

    const id = nanoid();

    await addVideo({
      id,
      title,
      url: videoUrl,
      pageUrl: pageUrl || "",
      genres: Array.isArray(genres) ? genres : [],
      affiliateUrl: affUrl || "",
      affiliateLabel: affLabel || "商品を見る",
      source: source || "import",
      duration: normalizedDuration,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      ok: true,
      inserted: true,
      id,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}