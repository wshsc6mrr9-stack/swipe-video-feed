// src/components/GenreMenu.tsx
"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { GENRE_ALL, GENRE_GROUPS, genreLabel, type GenreKey } from "@/lib/genres";

type Props = {
  value: GenreKey;
  onChange: (v: GenreKey) => void;
};

function stopEvent(e: any) {
  e.stopPropagation();
  e.nativeEvent?.stopImmediatePropagation?.();
}

function blurActiveElement() {
  const el = document.activeElement as HTMLElement | null;
  if (el && typeof el.blur === "function") el.blur();
  // iOS Safari がズーム状態を引きずる時の保険
  setTimeout(() => {
    try {
      window.scrollTo(window.scrollX, window.scrollY);
    } catch {}
  }, 0);
}

export default function GenreMenu({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentLabel = useMemo(() => genreLabel(value), [value]);

  // 開いたら検索欄にフォーカス（任意）
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      try {
        inputRef.current?.focus();
      } catch {}
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  const close = () => {
    blurActiveElement();
    setOpen(false);
    setQ("");
  };

  const query = q.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!query) return GENRE_GROUPS;

    return GENRE_GROUPS.map((g) => {
      const items = g.items.filter((it) => {
        const hay = `${String(it.key)} ${it.label}`.toLowerCase();
        return hay.includes(query);
      });
      return { ...g, items };
    }).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <div className="absolute left-3 top-3 z-50" data-no-swipe="1">
      {/* 🔍ボタン */}
      <button
        data-no-swipe="1"
        className="inline-flex items-center gap-2 rounded-full bg-white/10 text-white px-3 py-2 text-sm font-semibold backdrop-blur"
        onPointerDown={stopEvent}
        onClick={(e) => {
          stopEvent(e);
          setOpen(true);
        }}
        aria-label="ジャンル検索"
      >
        <span className="text-base">🔍</span>
        <span className="max-w-[40vw] truncate">{currentLabel}</span>
      </button>

      {/* オーバーレイ */}
      {open && (
        <div
          className="fixed inset-0 z-[100]"
          data-no-swipe="1"
          onPointerDown={stopEvent}
          onClick={stopEvent}
          style={{ pointerEvents: "auto" }}
        >
          {/* 背景（ここだけはクリックで閉じる） */}
          <div
            className="absolute inset-0 bg-black/60"
            data-no-swipe="1"
            onPointerDown={stopEvent}
            onClick={(e) => {
              stopEvent(e);
              close();
            }}
          />

          {/* パネル */}
          <div
            className="absolute left-3 right-3 top-16 max-h-[78svh] overflow-auto rounded-2xl bg-neutral-950/95 border border-white/10 p-4 backdrop-blur"
            data-no-swipe="1"
            onPointerDown={stopEvent}
            onClick={stopEvent}
            style={{ pointerEvents: "auto" }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-white font-bold">ジャンル</div>
              <button
                data-no-swipe="1"
                className="rounded-lg bg-white/10 text-white px-3 py-2 text-sm"
                onPointerDown={stopEvent}
                onClick={(e) => {
                  stopEvent(e);
                  close();
                }}
              >
                閉じる
              </button>
            </div>

            {/* ✅ 検索（iPhoneズーム防止：必ず16px以上） */}
            <div className="mb-3">
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ジャンル検索（例：主観 / 超乳 / 企画）"
                inputMode="search"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-[16px] text-white outline-none"
                // ↑ text-[16px] が超重要（iOS自動ズーム対策）
                onPointerDown={stopEvent}
                onClick={stopEvent}
              />
              {q ? (
                <div className="mt-2 flex justify-end">
                  <button
                    className="text-xs rounded-full bg-white/10 text-white px-3 py-1"
                    onPointerDown={stopEvent}
                    onClick={(e) => {
                      stopEvent(e);
                      setQ("");
                      // 連続操作でもズーム残りを避ける
                      blurActiveElement();
                      setTimeout(() => inputRef.current?.focus(), 30);
                    }}
                  >
                    クリア
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mb-4">
              <button
                data-no-swipe="1"
                className={[
                  "w-full rounded-xl px-4 py-3 text-sm font-bold",
                  value === GENRE_ALL ? "bg-white text-black" : "bg-white/10 text-white",
                ].join(" ")}
                onPointerDown={stopEvent}
                onClick={(e) => {
                  stopEvent(e);
                  onChange(GENRE_ALL);
                  close();
                }}
              >
                All / ランダムに戻す
              </button>
            </div>

            <div className="space-y-5">
              {filteredGroups.map((group) => (
                <div key={group.title} data-no-swipe="1">
                  <div className="text-white/80 text-sm font-semibold mb-2">
                    {group.title}
                  </div>

                  <div className="grid grid-cols-3 gap-2" data-no-swipe="1">
                    {group.items.map((it) => {
                      const active = value === it.key;
                      return (
                        <button
                          key={it.key}
                          data-no-swipe="1"
                          className={[
                            "rounded-xl px-3 py-3 text-sm font-semibold",
                            active ? "bg-white text-black" : "bg-white/10 text-white",
                          ].join(" ")}
                          onPointerDown={stopEvent}
                          onClick={(e) => {
                            stopEvent(e);
                            onChange(it.key as GenreKey);
                            close();
                          }}
                        >
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredGroups.length === 0 ? (
                <div className="text-xs text-white/60">該当なし</div>
              ) : null}
            </div>

            <div className="mt-5 text-xs text-white/50">
              ※ All は「全動画をシャッフル」。ジャンルは「そのジャンルだけ」を再生。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
