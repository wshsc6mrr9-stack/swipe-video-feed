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

  // ✅ 追加：検索
  const [q, setQ] = useState("");

  const currentLabel = useMemo(() => genreLabel(value), [value]);

  // ✅ スワイプにイベントを渡さない（VideoFeedのpointer/touch対策）
  const stop = (e: any) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  const close = () => {
    setOpen(false);
    setQ("");
  };

  const query = q.trim().toLowerCase();

  // ✅ 追加：検索で絞り込み
  const filteredGroups = useMemo(() => {
    if (!query) return GENRE_GROUPS;

    return GENRE_GROUPS.map((g) => {
      const items = g.items.filter((it) => {
        const t = `${it.key} ${it.label}`.toLowerCase();
        return t.includes(query);
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
              close();
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
                  close();
                }}
              >
                閉じる
              </button>
            </div>

            {/* ✅ 追加：検索欄 */}
            <div className="mb-3" data-no-swipe="1">
              <div className="relative" data-no-swipe="1">
                <input
                  data-no-swipe="1"
                  className="w-full rounded-xl bg-white/10 text-white px-4 py-3 text-sm outline-none border border-white/10 focus:border-white/25"
                  placeholder="検索（例：オフィス / フェチ / VR / 3P）"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onPointerDown={stop}
                  onClick={stop}
                  autoFocus
                />
                {q ? (
                  <button
                    data-no-swipe="1"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white/10 text-white px-2 py-1 text-xs"
                    onPointerDown={stop}
                    onClick={(e) => {
                      stop(e);
                      setQ("");
                    }}
                    aria-label="検索クリア"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
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
                  close();
                }}
              >
                All / ランダムに戻す
              </button>
            </div>

            <div className="space-y-5">
              {(filteredGroups.length ? filteredGroups : []).map((group) => (
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

              {/* ✅ 追加：該当なし */}
              {filteredGroups.length === 0 ? (
                <div className="text-sm text-white/60 py-10 text-center">
                  該当なし
                </div>
              ) : null}
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
