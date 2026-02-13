// src/app/embed/[id]/page.tsx
import { notFound } from "next/navigation";
import { listVideos } from "@/lib/videosStore";

type Props = {
  params: { id: string };
};

export default async function EmbedPage({ params }: Props) {
  const id = params.id;

  // ✅ listVideos は { items, total }
  const { items } = await listVideos();

  const v = items.find((x) => String(x.id) === String(id));
  if (!v) return notFound();

  const title = (v.title || "").trim() || "Video";
  const videoUrl = (v.url || "").trim();
  const poster = (v.poster || "").trim();

  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <style>{`
          html, body {
            margin: 0;
            padding: 0;
            background: #000;
            height: 100%;
          }
          .wrap {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #000;
          }
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <video
            src={videoUrl}
            poster={poster || undefined}
            controls
            playsInline
            muted
            autoPlay
            preload="metadata"
          />
        </div>
      </body>
    </html>
  );
}
