import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Swipe Video Feed";
export const size = { width: 1200, height: 675 }; // Xでよく使う比率（少し縦長）
export const contentType = "image/png";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://swipe-video-feed.vercel.app";

const HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "swipe-video-feed.vercel.app";
  }
})();

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0b1220 0%, #000000 65%)",
          color: "#fff",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
          position: "relative",
          padding: 72,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 56,
            top: 56,
            bottom: 56,
            width: 8,
            borderRadius: 999,
            background: "linear-gradient(180deg, #60a5fa 0%, #34d399 100%)",
            opacity: 0.95,
          }}
        />

        <div style={{ width: "100%", maxWidth: 980 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: -1,
              lineHeight: 1.05,
            }}
          >
            Swipe Video Feed
          </div>

          <div style={{ marginTop: 22, fontSize: 30, opacity: 0.9 }}>
            縦スワイプでショート動画を連続視聴
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 48,
            bottom: 40,
            fontSize: 18,
            opacity: 0.6,
          }}
        >
          {HOST}
        </div>
      </div>
    ),
    size
  );
}
