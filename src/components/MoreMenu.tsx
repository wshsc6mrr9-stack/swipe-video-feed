"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: "absolute", top: 12, right: 12, zIndex: 80 }}
      data-no-swipe="1"
    >
      {/* トリガー（…） */}
      <button
        data-no-swipe="1"
        data-ui="controls"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="メニュー"
        title="メニュー"
        style={triggerBtn}
      >
        ⋯
      </button>

      {/* メニュー本体 */}
      {open ? (
        <div
          data-no-swipe="1"
          data-ui="controls"
          style={panel}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={panelTitle}>メニュー</div>

          <div style={{ display: "grid", gap: 10 }}>
            {/* ✅ 追加：ジャンル一覧 */}
            <Link style={itemBtn} href="/genre" onClick={() => setOpen(false)}>
              ジャンル一覧
            </Link>

            {/* ✅ 追加：adult-short-videos への導線 */}
            <Link
              style={itemBtn}
              href="/adult-short-videos"
              onClick={() => setOpen(false)}
            >
              アダルトショート動画
            </Link>

            <Link style={itemBtn} href="/info" onClick={() => setOpen(false)}>
              サイト情報
            </Link>
            <Link style={itemBtn} href="/about" onClick={() => setOpen(false)}>
              運営者情報
            </Link>
            <Link
              style={itemBtn}
              href="/privacy"
              onClick={() => setOpen(false)}
            >
              プライバシー
            </Link>
            <Link style={itemBtn} href="/terms" onClick={() => setOpen(false)}>
              利用規約
            </Link>
            <Link
              style={itemBtn}
              href="/contact"
              onClick={() => setOpen(false)}
            >
              お問い合わせ
            </Link>

            <button style={closeBtn} onClick={() => setOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const triggerBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 999,
  background: "rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(255,255,255,0.14)",
  fontWeight: 900,
  fontSize: 22,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};

const panel: React.CSSProperties = {
  marginTop: 10,
  width: 220,
  borderRadius: 16,
  padding: 12,
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

const panelTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "rgba(255,255,255,0.85)",
  letterSpacing: 1.2,
  marginBottom: 10,
};

const itemBtn: React.CSSProperties = {
  display: "block",
  textDecoration: "none",
  height: 40,
  borderRadius: 12,
  padding: "0 12px",
  background: "rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(255,255,255,0.14)",
  fontWeight: 800,
  fontSize: 13,
  lineHeight: "40px",
};

const closeBtn: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  padding: "0 12px",
  background: "rgba(255,255,255,0.16)",
  color: "rgba(255,255,255,0.98)",
  border: "1px solid rgba(255,255,255,0.18)",
  fontWeight: 900,
  fontSize: 13,
};
