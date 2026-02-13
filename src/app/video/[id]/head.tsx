import { listVideos } from "@/lib/videosStore";

type Props = {
  params: { id: string };
};

function absUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://swipe-video-feed.vercel.app";
  return path.startsWith("http") ? path : `${base}${path}`;
}

export default async function Head({ params }: Props) {
  const id = params.id;

  // ✅ listVideos は配列
  const items = await listVideos();
  const v = items.find((x: any) => String(x.id) === String(id));
  if (!v) return null;

  const title = (v.title || "").trim() || "Video";
  const description = title;
  const pageUrl = absUrl(`/video/${encodeURIComponent(id)}`);
  const ogImage = absUrl(`/video/${encodeURIComponent(id)}/opengraph-image`);

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />

      <meta property="og:type" content="video.other" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </>
  );
}
