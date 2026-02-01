import { ImageResponse } from "next/og";

export const runtime = "edge";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0b",
          color: "white",
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: -1,
        }}
      >
        Swipe Video Feed
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
