// src/app/api/likes/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY_PREFIX = "likes:count:";

function keyOf(videoId: string) {
  return `${KEY_PREFIX}${videoId}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 500);

  const counts: Record<string, number> = {};

  await Promise.all(
    ids.map(async (id) => {
      const v = await redis.get<number>(keyOf(id));
      counts[id] = Number.isFinite(v as number) ? (v as number) : 0;
    })
  );

  return NextResponse.json({ ok: true, counts });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const videoId = String(body?.videoId ?? "");
  const deltaRaw = Number(body?.delta ?? 0);

  if (!videoId) {
    return NextResponse.json({ ok: false, error: "videoId required" }, { status: 400 });
  }

  const delta = deltaRaw >= 1 ? 1 : deltaRaw <= -1 ? -1 : 0;
  if (!delta) {
    return NextResponse.json({ ok: false, error: "delta must be +1 or -1" }, { status: 400 });
  }

  const k = keyOf(videoId);

  // incrby は負にもできるので、0未満になったら 0 に戻す
  const next = await redis.incrby(k, delta);
  if ((next as number) < 0) {
    await redis.set(k, 0);
    return NextResponse.json({ ok: true, count: 0 });
  }

  return NextResponse.json({ ok: true, count: Number(next) });
}
