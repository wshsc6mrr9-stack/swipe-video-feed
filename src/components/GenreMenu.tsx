"use client";

import React, { useMemo, useState } from "react";
import {
  GENRE_ALL,
  GENRE_LIKES,
  GENRE_GROUPS,
  type GenreKey,
} from "@/lib/genres";

type Props = {
  value: GenreKey[]; // ✅ 複数
  onChange: (v: GenreKey[]) => void; // ✅ 複数

  // ✅ 検索1本（タイトル検索 + ジャンル絞り込み両方に使う）
  query: string;
  onChangeQuery: (s: string) => void;
};

function stop(e: any) {
  e?.stopPropagation?.();
  e?.nativeEvent?.stopImmediatePropagation?.();
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function normalizeSelected(value: GenreKey[]) {
  const v = Array.isArray(value) ? value : [];
  const cleaned = v.map((x) => String(x)).filter(Boolean) as GenreKey[];

  // ALL と LIKES は単独扱い（他と混ぜない）
  if (cleaned.includes(GENRE_ALL)) return [GENRE_ALL];
  if (cleaned.includes(GENRE_LIKES)) return [GENRE_LIKES];

  const out = cleaned.filter((x) => x !== GENRE_ALL && x !== GENRE_LIKES);
  return (out.length ? (uniq(out) as GenreKey[]) : [GENRE_ALL]) as GenreKey[];
}

function labelOf(key: GenreKey) {
  if (key === GENRE_ALL) return "All";
  if (key === GENRE_LIKES) return "♡ランキング";

  for (const g of GENRE_GROUPS) {
    for (const it of g.items) {
      if (it.key === key) return it.label;
    }
  }
  return String(key);
}

export default function GenreMenu({ value, onChange, query, onChangeQuery }: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => normalizeSelected(value), [value]);

  const summaryText = useMemo(() => {
    const labels = selected.map(labelOf);

    // ✅ 開いてる間は「個別に出す（+4 表示しない）」
    if (open) return labels;

    // ✅ 閉じたら「クール +4」形式
    if (selected.length <= 1) return [labels[0] ?? "All"];
    return [`${labels[0]} +${selected.length - 1}`];
  }, [selected, open]);

  // ✅ 1本の検索入力を、ジャンル絞り込みにも使う
  const genreQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!genreQuery) return GENRE_GROUPS;

    return GENRE_GROUPS.map((g) => {
      const items = g.items.filter((it) => {
        const t = `${it.key} ${it.label}`.toLowerCase();
        return t.includes(genreQuery);
      });
      return { ...g, items };
    }).filter((g) => g.items.length > 0);
  }, [genreQuery]);

  function setSelected(next: GenreKey[]) {
    onChange(normalizeSelected(next));
  }

  function reset() {
    // ✅ 検索もジャンルもまとめてリセット
    onChangeQuery("");
    setSelected([GENRE_ALL]);
  }

  function toggle(key: GenreKey) {
    // ALL / LIKES は単独
    if (key === GENRE_ALL) return setSelected([GENRE_ALL]);
    if (key === GENRE_LIKES) return setSelected([GENRE_LIKES]);

    // いま ALL/LIKES 単独なら、そこから切り替え
    const cur = selected.filter((x) => x !== GENRE_ALL && x !== GENRE_LIKES);
    const exists = cur.includes(key);

    const next = exists ? cur.filter((x) => x !== key) : [...cur, key];
    setSelected(next.length ? next : [GENRE_ALL]);
  }

  return (
    <div className="relative" data-no-swipe="1" onClick={(e) => stop(e)}>
      {/* トリガ */}
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
        className="rounded-full bg-white/10 text-white border border-white/10 px-3 py-2 text-sm font-semibold active:bg-white/15"
      >
        {open ? "ジャンル" : "ジャンル検索"}
      </button>

      {/* ✅ 閉じてる時の左上表示（クール +4） */}
      {!open ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {summaryText.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-white"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      {/* パネル */}
      {open ? (
        <div
          className="absolute left-0 mt-3 w-[340px] max-w-[84vw] rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-xl p-3"
          style={{
            maxHeight: "72svh",
            overflow: "hidden",
          }}
          onClick={(e) => stop(e)}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-sm font-bold text-white/90">ジャンル</div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  reset();
                }}
                className="text-xs rounded-full bg-white/10 border border-white/10 text-white px-3 py-1"
              >
                リセット
              </button>
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  setOpen(false);
                }}
                className="text-xs rounded-full bg-white/10 border border-white/10 text-white px-3 py-1"
              >
                閉じる
              </button>
            </div>
          </div>

          {/* ✅ 検索（これ1本だけ：タイトル検索 + ジャンル絞り込み） */}
          <input
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="検索（タイトル/ジャンル）"
            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none text-white placeholder:text-white/40"
          />

          {/* ✅ 2カラム：左=選択UI / 右=選択中 */}
          <div className="mt-2 grid grid-cols-[1fr_110px] gap-2">
            {/* 左：選択UI */}
            <div
              className="rounded-xl bg-black/20 border border-white/10 p-2"
              style={{
                maxHeight: "56svh",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
              }}
            >
              {/* ALL */}
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  toggle(GENRE_ALL);
                }}
                className={[
                  "w-full text-left rounded-xl border px-3 py-[4px] text-sm transition",
                  selected.includes(GENRE_ALL)
                    ? "bg-white text-black border-white"
                    : "bg-white/10 text-white border-white/10",
                ].join(" ")}
              >
                All
              </button>

              {/* ランキング */}
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  toggle(GENRE_LIKES);
                }}
                className={[
                  "mt-2 w-full text-left rounded-xl border px-3 py-[4px] text-sm transition",
                  selected.includes(GENRE_LIKES)
                    ? "bg-white text-black border-white"
                    : "bg-white/10 text-white border-white/10",
                ].join(" ")}
              >
                ♡ランキング
              </button>

              {/* グループ */}
              <div className="mt-3 space-y-3">
                {filteredGroups.map((g) => (
                  <div key={String(g.title)}>
                    <div className="text-[11px] text-white/60 mb-1">
                      {g.title}
                    </div>

                    <div className="space-y-1">
                      {g.items.map((it) => {
                        const k = it.key as GenreKey;
                        const on = selected.includes(k);

                        return (
                          <button
                            key={String(k)}
                            type="button"
                            onClick={(e) => {
                              stop(e);
                              toggle(k);
                            }}
                            className={[
                              "w-full text-left rounded-xl border px-3 py-[4px] text-sm transition",
                              on
                                ? "bg-white text-black border-white"
                                : "bg-white/10 text-white border-white/10",
                            ].join(" ")}
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
            </div>

            {/* 右：選択中 */}
            <div className="rounded-xl bg-black/20 border border-white/10 p-2">
              <div className="text-[11px] text-white/60 mb-2">選択中</div>

              {selected.length === 1 && selected[0] === GENRE_ALL ? (
                <div className="text-xs text-white/40">なし</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selected
                    .filter((x) => x !== GENRE_ALL && x !== GENRE_LIKES)
                    .map((k) => (
                      <button
                        key={String(k)}
                        type="button"
                        onClick={(e) => {
                          stop(e);
                          toggle(k);
                        }}
                        className="w-full text-left rounded-full bg-white/10 border border-white/10 px-2 py-1 text-[11px] leading-tight text-white"
                        title="タップで外す"
                      >
                        {labelOf(k)}
                      </button>
                    ))}

                  {/* LIKES 選択時も細長く */}
                  {selected.includes(GENRE_LIKES) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        stop(e);
                        toggle(GENRE_LIKES);
                      }}
                      className="w-full text-left rounded-full bg-white/10 border border-white/10 px-2 py-1 text-[11px] leading-tight text-white"
                      title="タップで外す"
                    >
                      ♡ランキング
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
