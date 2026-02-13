import { redis } from "@/lib/upstash";
import { NextResponse } from "next/server";

export async function POST() {
  await redis.del("videos");
  await redis.del("import_queue");
  await redis.del("videos:published");

  return NextResponse.json({ ok: true });
}
