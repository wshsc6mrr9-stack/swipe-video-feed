// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 0;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          backgroundColor: "#0b1220",
          color: "#e5e7eb",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div
            style={{
              width: 10,
              height: 110,
              borderRadius: 999,
              background:
                "linear-gradient(180deg, #60a5fa 0%, #34d399 100%)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -1 }}>
              Swipe Video Feed
            </div>
            <div style={{ fontSize: 30, color: "#cbd5e1" }}>
              縦スワイプでショート動画を連続視聴
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {["Next.js", "TikTok風UI", "Swipe"].map((t) => (
                <div
                  key={t}
                  style={{
                    fontSize: 22,
                    padding: "8px 14px",
                    borderRadius: 999,
                    backgroundColor: "rgba(148,163,184,0.15)",
                    border: "1px solid rgba(148,163,184,0.25)",
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 40, fontSize: 18, color: "#94a3b8" }}>
          swipe-video-feed.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
