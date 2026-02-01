// src/app/video/[id]/opengraph-image/route.ts
import React from "react";
import { ImageResponse } from "next/og";

export const runtime = "nodejs"; // ✅ ここが本番0バイトの特効薬
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id?: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const p = await ctx.params;
    const id = String(p?.id ?? "unknown");

    const el = React.createElement(
      "div",
      {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0f",
          color: "#fff",
          fontSize: 64,
          fontWeight: 800,
        },
      },
      `VIDEO ${id}`
    );

    return new ImageResponse(el, { width: 1200, height: 630 });
  } catch (e: any) {
    return new Response(`OG ERROR: ${e?.message ?? String(e)}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
