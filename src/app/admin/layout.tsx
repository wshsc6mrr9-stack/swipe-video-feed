"use client";

import React, { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // ✅ フィード側で触れない設定が残ってても、adminでは強制で戻す
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;

    html.style.overflow = "auto";
    body.style.overflow = "auto";
    body.style.touchAction = "auto";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouchAction;
    };
  }, []);

  return (
    <div className="min-h-[100svh] overflow-auto touch-auto bg-black text-white">
      {children}
    </div>
  );
}

