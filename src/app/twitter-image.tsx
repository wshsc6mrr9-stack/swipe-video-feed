import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Swipe Video Feed";
export const size = { width: 1200, height: 675 };
export const contentType = "image/png";

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
          padding: 72,
          background:
            "radial-gradient(900px 600px at 20% 25%, rgba(56,189,248,0.20), rgba(0,0,0,0)), radial-gradient(900px 600px at 80% 10%, rgba(34,197,94,0.18), rgba(0,0,0,0)), linear-gradient(180deg, #0b1220 0%, #0a1020 100%)",
          color: "#e5e7eb",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 98,
            width: 10,
            height: 240,
            borderRadius: 999,
            background: "linear-gradient(180deg, #22c55e 0%, #38bdf8 100%)",
            boxShadow: "0 0 30px rgba(56,189,248,0.25)",
          }}
        />

        <div style={{ fontSize: 70, fontWeight: 800, letterSpacing: -1 }}>
          Swipe Video Feed
        </div>

        <div style={{ marginTop: 18, fontSize: 28, opacity: 0.9 }}>
          縦スワイプでショート動画を連続視聴
        </div>

        <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
          {["Next.js", "TikTok風UI", "Swipe"].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 20,
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              {t}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            right: 44,
            bottom: 34,
            fontSize: 18,
            opacity: 0.55,
          }}
        >
          swipe-video-feed.vercel.app
        </div>
      </div>
    ),
    size
  );
}
