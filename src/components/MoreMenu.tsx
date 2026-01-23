"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function MoreMenu() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

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
    <div ref={boxRef} className="absolute top-3 right-3 z-[60] pointer-events-auto">
      <button
        type="button"
        aria-label="メニュー"
        onClick={() => setOpen((v) => !v)}
        className="h-10 w-10 rounded-full bg-black/50 text-white text-xl flex items-center justify-center backdrop-blur border border-white/10"
      >
        …
      </button>

      {open && (
        <div className="mt-2 w-56 rounded-2xl bg-black/80 text-white backdrop-blur border border-white/10 overflow-hidden">
          <div className="px-3 py-2 text-xs text-white/70">メニュー</div>

          <NavItem href="/info" label="まとめて見る（info）" />
          <div className="h-px bg-white/10" />

          <NavItem href="/about" label="About（サイト説明）" />
          <NavItem href="/privacy" label="Privacy（プライバシー）" />
          <NavItem href="/terms" label="Terms（利用規約）" />
          <NavItem href="/contact" label="Contact（連絡先）" />

          <div className="h-px bg-white/10" />
          <NavItem href="/" label="動画に戻る" />
        </div>
      )}
    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-3 text-sm hover:bg-white/10 active:bg-white/10"
    >
      {label}
    </Link>
  );
}
