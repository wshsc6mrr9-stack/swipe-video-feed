// src/app/video/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { headers } from "next/headers";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FALLBACK_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://swipe-video-feed.vercel.app";

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return FALLBACK_SITE_URL;
}

async function fetchVideoById(id: string) {
  const origin = await getOrigin();
  const res = await fetch(
    `${origin}/api/videos?id=${encodeURIComponent(id)}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const v = data?.video ?? data;

  if (!v?.id) return null;

  return {
    id: String(v.id),
    title: String(v.title ?? ""),
    poster: v.poster ? String(v.poster) : "",
  };
}

export default async function Image({ params }: { params: { id: string } }) {
  const id = String(params?.id ?? "").trim();
  const video = id ? await fetchVideoById(id) : null;

  const title = (video?.title || `Video ${id || "unknown"}`).trim();
  const poster = video?.poster || "";
  const hasPoster = /^https?:\/\//.test(poster);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          background: "#000",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          padding: 64,
        }}
      >
        {hasPoster ? (
          <img
            src={poster}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.92) 100%)",
          }}
        />

        <div style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.8)",
              marginBottom: 12,
            }}
          >
            Swipe Video Feed
          </div>

          <div
            style={{
              fontSize: 54,
              lineHeight: 1.1,
              fontWeight: 800,
              color: "#fff",
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 22,
              color: "rgba(255,255,255,0.75)",
            }}
          >
            {`/video/${id || "unknown"}`}
          </div>
        </div>
      </div>
    ),
    size
  );
}
