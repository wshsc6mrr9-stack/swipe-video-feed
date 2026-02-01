import React from "react";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/^\/video\/([^/]+)\/opengraph-image\/?$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  ctx: { params?: { id?: string } }
) {
  try {
    const idFromParams = ctx?.params?.id ? String(ctx.params.id) : null;
    const idFromUrl = pickIdFromUrl(req.url);
    const id = (idFromParams || idFromUrl || "unknown").trim();

    const el = React.createElement(
      "div",
      {
        style: {
          width: "1200px",
          height: "630px",
          background: "#0b0b0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: "-1px",
        } as React.CSSProperties,
      },
      `Video ${id}`
    );

    return new ImageResponse(el, { width: 1200, height: 630 });
  } catch (e: any) {
    return new Response(`OG ERROR: ${e?.message ?? String(e)}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
