// 魔法の設定：このページは絶対にキャッシュ（保存）せず、常に最新のデータを取得する！
export const dynamic = "force-dynamic";
export const revalidate = 0;

import VideoFeedNoSSR from "@/app/VideoFeedNoSSR";

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParamsPromise;
}) {
  const sp = await searchParams;

  const v = sp?.v;
  const startId = Array.isArray(v) ? String(v[0] ?? "").trim() : String(v ?? "").trim();

  return <VideoFeedNoSSR startId={startId} />;
}