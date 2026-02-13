// src/app/video/[id]/head.tsx
import { listVideos } from "@/lib/videosStore";

type Props = {
  params: { id: string };
};

function absUrl(pathOrUrl: string) {
  const s = String(pathOrUrl || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://swipe-video-feed.vercel.app";

  if (s.startsWith("/")) return base + s;
  return base + "/" + s;
}

export default async function Head({ params }: Props) {
  const id = params.id;

  // ✅ items を必ず取り出す
  const { items } = await listVideos();
  const v = items.find((x) => String(x.id) === String(id));

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://swipe-video-feed.vercel.app";

  const pageUrl = `${base}/video/${encodeURIComponent(id)}`;
  const embedUrl = `${base}/embed/${encodeURIComponent(id)}`;

  const title = (v?.title || "").trim() || "Video";
  const desc = title;

  // 動画URL（mp4）
  const videoUrl = absUrl((v?.url || "").trim());

  // サムネ（なければ og.png）
  const poster = absUrl((v?.poster || "/og.png").trim());

  const w = "1280";
  const h = "720";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={desc} />

      {/* Open Graph */}
      <meta property="og:type" content="video.other" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={poster} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* OG video */}
      <meta property="og:video" content={videoUrl} />
      <meta property="og:video:secure_url" content={videoUrl} />
      <meta property="og:video:type" content="video/mp4" />
      <meta property="og:video:width" content={w} />
      <meta property="og:video:height" content={h} />

      {/* Twitter Player Card */}
      <meta name="twitter:card" content="player" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={poster} />
      <meta name="twitter:player" content={embedUrl} />
      <meta name="twitter:player:width" content={w} />
      <meta name="twitter:player:height" content={h} />
      <meta name="twitter:player:stream" content={videoUrl} />
      <meta
        name="twitter:player:stream:content_type"
        content="video/mp4"
      />
    </>
  );
}
