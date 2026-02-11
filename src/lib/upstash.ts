import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const QUEUE_KEY = "import:queue";

/**
 * import キュー一覧取得
 */
async function getImportQueue(limit: number) {
  // list から最新順で取得
  const items = await redis.lrange(QUEUE_KEY, 0, limit - 1);
  return items.map((v: any) => {
    try {
      return typeof v === "string" ? JSON.parse(v) : v;
    } catch {
      return { id: String(v) };
    }
  });
}

/**
 * import 完了（削除）
 */
async function doneImport(id: string) {
  const all = await redis.lrange(QUEUE_KEY, 0, -1);
  for (const v of all) {
    try {
      const obj = typeof v === "string" ? JSON.parse(v) : v;
      if (obj?.id === id) {
        await redis.lrem(QUEUE_KEY, 1, v);
        return;
      }
    } catch {
      // noop
    }
  }
}

export const upstash = {
  getImportQueue,
  doneImport,
};
