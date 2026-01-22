import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 675 };

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background:
            "linear-gradient(135deg, #0b0b0f 0%, #111827 45%, #0b0b0f 100%)",
          color: "#ffffff",
          position: "relative",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 25% 35%, rgba(59,130,246,0.30), transparent 55%), radial-gradient(circle at 75% 65%, rgba(34,197,94,0.20), transparent 55%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", gap: "22px" }}>
          <div
            style={{
              width: 14,
              borderRadius: 999,
              background: "linear-gradient(180deg, #3b82f6, #22c55e)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 60, fontWeight: 850, letterSpacing: -1 }}>
              Swipe Video Feed
            </div>
            <div style={{ fontSize: 28, opacity: 0.9 }}>
              縦スワイプでショート動画を連続視聴
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 28,
            bottom: 24,
            fontSize: 18,
            opacity: 0.7,
          }}
        >
          swipe-video-feed.vercel.app
        </div>
      </div>
    ),
    size
  );
}
