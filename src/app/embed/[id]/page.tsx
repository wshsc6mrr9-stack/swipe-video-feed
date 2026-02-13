import { notFound } from "next/navigation";
import { listVideos } from "@/lib/videosStore";

type Props = {
  params: { id: string };
};

export default async function EmbedPage({ params }: Props) {
  const id = params.id;

  // ✅ listVideos は配列
  const items = await listVideos();

  const v = items.find((x: any) => String(x.id) === String(id));
  if (!v) return notFound();

  const title = (v.title || "").trim() || "Video";
  const videoUrl = (v.url || "").trim();
  const poster = (v.poster || "").trim();

  return (
    <div className="w-full h-full bg-black">
      <video
        src={videoUrl}
        poster={poster}
        controls
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
}
