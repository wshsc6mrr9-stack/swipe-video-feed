"use client";

import React, { useMemo, useRef, useState } from "react";
import { GENRE_ALL, GENRE_LIKES, GENRE_GROUPS, type GenreKey } from "@/lib/genres";

type Props = {
  value: GenreKey;
  onChange: (v: GenreKey) => void;
};

function stop(e: any) {
  e.stopPropagation?.();
  e.nativeEvent?.stopImmediatePropagation?.();
}

// GENRE_GROUPS から label を引く（genreLabel が無くても動く）
// ✅ 左上ボタン表示だけ「ジャンル検索」に変更
function labelOf(key: GenreKey) {
  if (key === GENRE_ALL) return "ジャンル検索";
  if (key === GENRE_LIKES) return "♡ランキング";
  for (const g of GENRE_GROUPS as any[]) {
    for (const it of g.items as any[]) {
      if (it.key === key) return String(it.label ?? key);
    }
  }
  return String(key);
}

export default function GenreMenu({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  // ✅ iPhone Safariズーム対策：閉じる時に blur する
  const inputRef = useRef<HTMLInputElement | null>(null);
  const close = () => {
    try {
      inputRef.current?.blur();
    } catch {}
    setOpen(false);
  };

  const filteredGroups = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return GENRE_GROUPS as any[];

    return (GENRE_GROUPS as any[])
      .map((g) => ({
        ...g,
        items: (g.items as any[]).filter((it) => {
          const k = String(it.key).toLowerCase();
          const l = String(it.label ?? "").toLowerCase();
          return k.includes(query) || l.includes(query);
        }),
      }))
      .filter((g) => (g.items as any[]).length > 0);
  }, [q]);

  return (
    <div
      className="relative"
      data-no-swipe="1"
      onPointerDown={stop}
      onPointerMove={stop}
      onTouchStart={stop}
      onTouchMove={stop}
      onWheel={stop}
    >
      {/* 開くボタン */}
      <button
        type="button"
        className="px-3 py-2 rounded-full bg-white/10 text-white text-sm border border-white/15"
        onClick={() => setOpen((v) => !v)}
      >
        {labelOf(value)}
      </button>

      {/* メニュー本体 */}
      {open && (
        <div
          className="absolute left-0 mt-2 w-56 rounded-2xl border border-white/15 bg-black/70 backdrop-blur p-3 shadow-xl"
          style={{ maxHeight: "70vh", overflow: "hidden", touchAction: "pan-y" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs text-white/70">ジャンル</div>
            <button
              type="button"
              className="ml-auto text-white/70 text-xs px-2 py-1 rounded-md bg-white/10"
              onClick={close}
            >
              ×
            </button>
          </div>

          {/* ✅ iPhone Safariズーム対策：fontSize 16px */}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="検索"
            className="w-full mb-2 px-3 py-2 rounded-xl bg-white/10 text-white outline-none border border-white/10"
            style={{ fontSize: 16 }} // ←これが最重要
          />

          {/* ✅ ここがスクロール領域 */}
          <div
            className="space-y-2"
            style={{
              maxHeight: "56vh",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
              paddingRight: 4,
            }}
          >
            {/* All */}
            <button
              type="button"
              className={`w-full text-left px-3 py-2 rounded-xl border ${
                value === GENRE_ALL
                  ? "bg-white text-black border-white"
                  : "bg-white/10 text-white border-white/10"
              }`}
              onClick={() => {
                onChange(GENRE_ALL);
                close();
              }}
            >
              All
            </button>

            {/* ✅ All の次に：♡ランキング */}
            <button
              type="button"
              className={`w-full text-left px-3 py-2 rounded-xl border ${
                value === GENRE_LIKES
                  ? "bg-white text-black border-white"
                  : "bg-white/10 text-white border-white/10"
              }`}
              onClick={() => {
                onChange(GENRE_LIKES);
                close();
              }}
            >
              ♡ランキング
            </button>

            {filteredGroups.map((g) => (
              <div key={String(g.title)} className="space-y-2">
                <div className="text-xs text-white/60 px-1">{g.title}</div>
                <div className="space-y-2">
                  {(g.items as any[]).map((it) => {
                    const k = it.key as GenreKey;
                    const active = value === k;
                    return (
                      <button
                        key={String(it.key)}
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-xl border ${
                          active
                            ? "bg-white text-black border-white"
                            : "bg-white/10 text-white border-white/10"
                        }`}
                        onClick={() => {
                          onChange(k);
                          close();
                        }}
                      >
                        {String(it.label ?? it.key)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
