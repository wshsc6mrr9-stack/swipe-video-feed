import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

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
          padding: "72px",
          background:
            "linear-gradient(135deg, #0b0b0f 0%, #111827 40%, #0b0b0f 100%)",
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
              "radial-gradient(circle at 20% 30%, rgba(99,102,241,0.35), transparent 55%), radial-gradient(circle at 80% 70%, rgba(16,185,129,0.25), transparent 55%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", gap: "22px" }}>
          <div
            style={{
              width: 14,
              borderRadius: 999,
              background: "linear-gradient(180deg, #6366f1, #10b981)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1 }}>
              Swipe Video Feed
            </div>
            <div style={{ fontSize: 28, opacity: 0.9 }}>
              縦スワイプでショート動画を連続視聴
            </div>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  fontSize: 18,
                }}
              >
                Next.js
              </div>
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  fontSize: 18,
                }}
              >
                TikTok風UI
              </div>
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  fontSize: 18,
                }}
              >
                Swipe
              </div>
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
