"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  GENRE_ALL,
  GENRE_LIKES,
  GENRE_FAVORITES,
  GENRE_GROUPS,
  type GenreKey,
} from "@/lib/genres";

type Props = {
  value: GenreKey[];
  onChange: (v: GenreKey[]) => void;
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

  if (cleaned.includes(GENRE_ALL)) return [GENRE_ALL];
  if (cleaned.includes(GENRE_LIKES)) return [GENRE_LIKES];
  if (cleaned.includes(GENRE_FAVORITES)) return [GENRE_FAVORITES];

  const out = cleaned.filter(
    (x) => x !== GENRE_ALL && x !== GENRE_LIKES && x !== GENRE_FAVORITES
  );
  return (out.length ? (uniq(out) as GenreKey[]) : [GENRE_ALL]) as GenreKey[];
}

function labelOf(key: GenreKey) {
  if (key === GENRE_ALL) return "All";
  if (key === GENRE_LIKES) return "♡ランキング";
  if (key === GENRE_FAVORITES) return "♡お気に入り";

  for (const g of GENRE_GROUPS) {
    for (const it of g.items) {
      if (it.key === key) return it.label;
    }
  }
  return String(key);
}

export default function GenreMenu({
  value,
  onChange,
  query,
  onChangeQuery,
}: Props) {
  const [open, setOpen] = useState(false);

  // ★ 追加: 入力中の文字を一時的に保存する
  const [localQuery, setLocalQuery] = useState(query);

  // 親の検索ワードが外からリセットされた時などに同期する
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const selected = useMemo(() => normalizeSelected(value), [value]);

  const summaryText = useMemo(() => {
    const labels = selected.map(labelOf);
    if (open) return labels;
    if (selected.length <= 1) return [labels[0] ?? "All"];
    return [`${labels[0]} +${selected.length - 1}`];
  }, [selected, open]);

  // 左側のジャンルリスト絞り込みは、打っている途中の文字(localQuery)でリアルタイムに反応させる
  const genreQuery = localQuery.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!genreQuery) return GENRE_GROUPS;

    return GENRE_GROUPS
      .map((g) => {
        const items = g.items.filter((it) => {
          const t = `${it.key} ${it.label}`.toLowerCase();
          return t.includes(genreQuery);
        });
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [genreQuery]);

  function setSelected(next: GenreKey[]) {
    onChange(normalizeSelected(next));
  }

  function reset() {
    setLocalQuery("");
    onChangeQuery("");
    setSelected([GENRE_ALL]);
  }

  function toggle(key: GenreKey) {
    if (key === GENRE_ALL) return setSelected([GENRE_ALL]);
    if (key === GENRE_LIKES) return setSelected([GENRE_LIKES]);
    if (key === GENRE_FAVORITES) return setSelected([GENRE_FAVORITES]);

    const cur = selected.filter(
      (x) => x !== GENRE_ALL && x !== GENRE_LIKES && x !== GENRE_FAVORITES
    );
    const exists = cur.includes(key);

    const next = exists ? cur.filter((x) => x !== key) : [...cur, key];
    setSelected(next.length ? next : [GENRE_ALL]);
  }

  // ★ 追加: 検索を実行する（エンターが押された時）
  function executeSearch() {
    onChangeQuery(localQuery);
    // 検索後、スマホのキーボードを閉じる
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement)?.blur();
    }
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
            touchAction: "pan-y",
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

          {/* ★ 修正: formで囲むことで、スマホの検索ボタン(Enter)に反応させる */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch();
            }}
            className="w-full relative flex gap-2"
          >
            <input
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="検索（タイトル/ジャンル）"
              inputMode="search"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-base outline-none text-white placeholder:text-white/40"
              style={{ fontSize: 16 }}
              onPointerDown={(e) => stop(e)}
              onTouchStart={(e) => stop(e)}
              onTouchMove={(e) => stop(e)}
            />
            {/* 検索ボタン（横に配置） */}
            <button
              type="submit"
              className="rounded-xl bg-white/20 px-3 py-2 text-sm font-bold text-white border border-white/10 whitespace-nowrap active:bg-white/30"
              onPointerDown={(e) => stop(e)}
            >
              検索
            </button>
          </form>

          {/* 2カラム：左=選択UI / 右=選択中 */}
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

              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  toggle(GENRE_FAVORITES);
                }}
                className={[
                  "mt-2 w-full text-left rounded-xl border px-3 py-[4px] text-sm transition",
                  selected.includes(GENRE_FAVORITES)
                    ? "bg-white text-black border-white"
                    : "bg-white/10 text-white border-white/10",
                ].join(" ")}
              >
                ♡お気に入り
              </button>

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
                    .filter(
                      (x) =>
                        x !== GENRE_ALL &&
                        x !== GENRE_LIKES &&
                        x !== GENRE_FAVORITES
                    )
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

                  {selected.includes(GENRE_FAVORITES) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        stop(e);
                        toggle(GENRE_FAVORITES);
                      }}
                      className="w-full text-left rounded-full bg-white/10 border border-white/10 px-2 py-1 text-[11px] leading-tight text-white"
                      title="タップで外す"
                    >
                      ♡お気に入り
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