"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function MoreMenu() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // ✅ スワイプ/親のハンドラにイベントを渡さない
  const stop = (e: any) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className="absolute top-3 right-3 z-[60] pointer-events-auto"
      data-no-swipe="1"
      onPointerDown={stop}
      onClick={stop}
    >
      <button
        type="button"
        aria-label="メニュー"
        data-no-swipe="1"
        onPointerDown={stop}
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
        className="h-10 w-10 rounded-full bg-black/50 text-white text-xl flex items-center justify-center backdrop-blur border border-white/10"
      >
        …
      </button>

      {open && (
        <div
          className="mt-2 w-56 rounded-2xl bg-black/80 text-white backdrop-blur border border-white/10 overflow-hidden"
          data-no-swipe="1"
          onPointerDown={stop}
          onClick={stop}
          style={{ pointerEvents: "auto" }}
        >
          <div className="px-3 py-2 text-xs text-white/70">メニュー</div>

          <NavItem href="/info" label="まとめて見る（info）" onSelect={() => setOpen(false)} />
          <div className="h-px bg-white/10" />

          <NavItem href="/about" label="About（サイト説明）" onSelect={() => setOpen(false)} />
          <NavItem href="/privacy" label="Privacy（プライバシー）" onSelect={() => setOpen(false)} />
          <NavItem href="/terms" label="Terms（利用規約）" onSelect={() => setOpen(false)} />
          <NavItem href="/contact" label="Contact（連絡先）" onSelect={() => setOpen(false)} />

          <div className="h-px bg-white/10" />

          {/* ✅ これが反応しない問題を確実に潰す：クリックを止めて、遷移前に閉じる */}
          <NavItem href="/" label="動画に戻る" onSelect={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

function NavItem({
  href,
  label,
  onSelect,
}: {
  href: string;
  label: string;
  onSelect?: () => void;
}) {
  const stop = (e: any) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  return (
    <Link
      href={href}
      data-no-swipe="1"
      onPointerDown={stop}
      onClick={(e) => {
        stop(e);
        onSelect?.();
        // Linkの遷移はNextがやってくれるので preventDefault しない
      }}
      className="block px-3 py-3 text-sm hover:bg-white/10 active:bg-white/10"
    >
      {label}
    </Link>
  );
}
