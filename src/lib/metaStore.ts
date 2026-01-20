// src/lib/metaStore.ts
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "@/lib/r2client";

export type VideoItem = {
  id: string;
  title: string;
  url: string;
  srcType: "mp4" | "hls";
  createdAt: number;
};

const META_KEY = "meta/videos.json";

async function readTextFromR2(key: string): Promise<string | null> {
  try {
    const res = await r2Client().send(
      new GetObjectCommand({
        Bucket: R2_BUCKET(),
        Key: key,
      })
    );
    const body = res.Body;
    if (!body) return null;

    // Body is a stream
    const chunks: Uint8Array[] = [];
    const stream = body as any;

    for await (const chunk of stream) {
      chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
    }
    const buf = Buffer.concat(chunks);
    return buf.toString("utf-8");
  } catch (e: any) {
    // 無い場合もここに来るので null にする
    return null;
  }
}

export async function readVideosFromR2(): Promise<VideoItem[]> {
  const txt = await readTextFromR2(META_KEY);
  if (!txt) return [];
  try {
    const data = JSON.parse(txt);
    if (!Array.isArray(data)) return [];
    return data as VideoItem[];
  } catch {
    return [];
  }
}

export async function writeVideosToR2(items: VideoItem[]) {
  const body = JSON.stringify(items, null, 2);
  await r2Client().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET(),
      Key: META_KEY,
      Body: body,
      ContentType: "application/json; charset=utf-8",
      CacheControl: "no-store",
    })
  );
}

// URL から R2 object key を作る（例: https://media.atok-online.com/3.mp4 -> "3.mp4"）
function keyFromUrl(fileUrl: string): string | null {
  try {
    const u = new URL(fileUrl);
    let p = u.pathname || "";
    if (p.startsWith("/")) p = p.slice(1);
    if (!p) return null;
    return decodeURIComponent(p);
  } catch {
    return null;
  }
}

// 実体ファイル削除（URLからkey推測してDeleteObject）
export async function deleteVideoObjectFromR2(fileUrl: string) {
  const key = keyFromUrl(fileUrl);
  if (!key) return;

  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET(),
      Key: key,
    })
  );
}
