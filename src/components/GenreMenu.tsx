// src/components/GenreMenu.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  GENRE_ALL,
  GENRE_GROUPS,
  genreLabel,
  type GenreKey,
} from "@/lib/genres";

type Props = {
  value: GenreKey;
  onChange: (v: GenreKey) => void;
};

export default function GenreMenu({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const currentLabel = useMemo(() => genreLabel(value), [value]);

  // ✅ スワイプにイベントを渡さない（VideoFeedのpointer/touch対策）
  const stop = (e: any) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  return (
    <div className="absolute left-3 top-3 z-50" data-no-swipe="1">
      {/* 🔍ボタン */}
      <button
        data-no-swipe="1"
        className="inline-flex items-center gap-2 rounded-full bg-white/10 text-white px-3 py-2 text-sm font-semibold backdrop-blur"
        onPointerDown={stop}
        onClick={(e) => {
          stop(e);
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
          onPointerDown={stop}
          onClick={stop}
          style={{ pointerEvents: "auto" }}
        >
          {/* 背景（ここだけはクリックで閉じる） */}
          <div
            className="absolute inset-0 bg-black/60"
            data-no-swipe="1"
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              setOpen(false);
            }}
          />

          {/* パネル */}
          <div
            className="absolute left-3 right-3 top-16 max-h-[78svh] overflow-auto rounded-2xl bg-neutral-950/95 border border-white/10 p-4 backdrop-blur"
            data-no-swipe="1"
            onPointerDown={stop}
            onClick={stop}
            style={{ pointerEvents: "auto" }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-white font-bold">ジャンル</div>
              <button
                data-no-swipe="1"
                className="rounded-lg bg-white/10 text-white px-3 py-2 text-sm"
                onPointerDown={stop}
                onClick={(e) => {
                  stop(e);
                  setOpen(false);
                }}
              >
                閉じる
              </button>
            </div>

            <div className="mb-4">
              <button
                data-no-swipe="1"
                className={[
                  "w-full rounded-xl px-4 py-3 text-sm font-bold",
                  value === GENRE_ALL
                    ? "bg-white text-black"
                    : "bg-white/10 text-white",
                ].join(" ")}
                onPointerDown={stop}
                onClick={(e) => {
                  stop(e);
                  onChange(GENRE_ALL);
                  setOpen(false);
                }}
              >
                All / ランダムに戻す
              </button>
            </div>

            <div className="space-y-5">
              {GENRE_GROUPS.map((group) => (
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
                            active
                              ? "bg-white text-black"
                              : "bg-white/10 text-white",
                          ].join(" ")}
                          onPointerDown={stop}
                          onClick={(e) => {
                            stop(e);
                            onChange(it.key as GenreKey);
                            setOpen(false);
                          }}
                        >
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 text-xs text-white/50">
              ※ All は「全動画をシャッフルして流す」。ジャンルは「そのジャンルだけ」を再生。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
