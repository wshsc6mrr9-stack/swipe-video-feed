// src/app/admin/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GENRE_GROUPS, type GenreKey } from "@/lib/genres";

type VideoItem = {
  id: string;
  title: string;
  url: string;
  poster?: string;
  affUrl?: string;
  affLabel?: string;
  createdAt: number;
  genres?: string[];
  genre?: string;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function normalizeText(v: any) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(v: any) {
  return normalizeText(v)
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[＿—–]/g, "-")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^#/, "");
}

/** "新人 #デビュー" / "ベスト #単体" みたいなのを単語にバラす */
function splitWords(s: string) {
  const t = normalizeText(s);
  if (!t) return [];
  return t
    .replace(/[“”"']/g, "")
    .split(/[\s#＃/／｜|・,、:：()（）【】\[\]{}「」<>]+/g)
    .map((x) => normalizeText(x))
    .filter(Boolean);
}

export default function AdminPage() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [affUrl, setAffUrl] = useState("");
  const [affLabel, setAffLabel] = useState("");

  // ✅ JSON貼り付け欄
  const [fanzaJson, setFanzaJson] = useState("");
  const fanzaRef = useRef<HTMLTextAreaElement | null>(null);

  const [genres, setGenres] = useState<GenreKey[]>(["other"]);
  const [genreQuery, setGenreQuery] = useState("");
  const [genreOpen, setGenreOpen] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ✅ トースト（ダイアログは出さない）
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1200);
  }

  /** GENRE_GROUPS から (key/label)→key の辞書を作る */
  const genreIndex = useMemo(() => {
    const map = new Map<string, GenreKey>();
    const allKeys: GenreKey[] = [];
    for (const g of GENRE_GROUPS) {
      for (const it of g.items) {
        const k = it.key as GenreKey;
        allKeys.push(k);
        map.set(normalizeKey(it.key), k);
        map.set(normalizeKey(it.label), k);
      }
    }
    return { map, allKeys: uniq(allKeys) };
  }, []);

  /** ✅ key → 日本語ラベル（選択済み表示を日本語にする） */
  const keyToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of GENRE_GROUPS) {
      for (const it of g.items) {
        map.set(String(it.key), String(it.label));
      }
    }
    return map;
  }, []);

  /** ✅ 日本語タグ→あなたのGenreKeyへ寄せる（必要なら増やせる） */
  const jpToKey = useMemo(() => {
    const dict: Array<[GenreKey, string[]]> = [
      ["debut", ["デビュー", "新人", "初av", "初AV", "初出演", "初登場", "初解禁"]],
      ["facial", ["顔射", "ぶっかけ"]],
      ["office-mix", ["ol", "ＯＬ", "オフィス", "女上司", "部下", "秘書", "社内", "人事"]],
      ["bishoujo", ["美少女", "ロリ", "かわいい", "清純", "美形"]],
      ["solo", ["単体", "単体作品", "単体作", "ソロ", "1人", "一人"]],
      ["4k", ["4k", "４ｋ", "高画質", "uhd", "UHD"]],
      ["hospital-clinic", ["病院", "クリニック", "医師", "看護", "ナース", "診察"]],
      ["college-student", ["大学生", "女子大生", "学生", "大学"]],
      ["massage-play", ["マッサージ", "エステ", "施術", "リフレ", "オイル"]],
      ["anal-sex", ["アナル", "肛門", "アナルセックス"]],
    ];
    return dict;
  }, []);

  const normalizedSelected = useMemo(() => {
    const cleaned = (genres ?? [])
      .map((g) => String(g))
      .filter(Boolean)
      .filter((g) => g !== "ALL");
    return uniq(cleaned) as GenreKey[];
  }, [genres]);

  function clearGenres() {
    setGenres(["other"]);
  }

  function toggleGenre(key: GenreKey) {
    setGenres((prev) => {
      const cur = Array.isArray(prev) ? prev : [];
      const exists = cur.includes(key);

      let next = exists ? cur.filter((x) => x !== key) : [...cur, key];

      if (next.length === 0) next = ["other"];
      if (next.length >= 2 && next.includes("other")) {
        next = next.filter((x) => x !== "other");
      }

      return uniq(next) as GenreKey[];
    });

    setGenreQuery("");
  }

  async function load() {
    setErr(null);
    const r = await fetch("/api/videos", { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) {
      setErr(j?.error ?? "load failed");
      return;
    }
    setItems(Array.isArray(j.items) ? j.items : []);
  }

  useEffect(() => {
    load();
  }, []);

  /** ✅ JSONから「タイトル/ジャンル/URL/aff/poster」拾う（即反映） */
  function applyPasteText(raw: string) {
    const s = normalizeText(raw);
    if (!s) return;

    let obj: any = null;
    try {
      obj = JSON.parse(s);
    } catch {
      return;
    }
    if (!obj || typeof obj !== "object") return;

    // ---- title
    const t = normalizeText(
      obj.title ??
        obj.name ??
        obj.workTitle ??
        obj.pageTitle ??
        obj.productTitle ??
        obj.videoTitle ??
        ""
    );
    if (t) setTitle(t);

    // ---- url (videoUrl / url / src)
    const u = normalizeText(obj.videoUrl ?? obj.url ?? obj.src ?? obj.videoSrc ?? "");
    if (u) setUrl(u);

    // ---- poster
    const p = normalizeText(obj.poster ?? obj.thumbnail ?? obj.thumb ?? obj.image ?? "");
    if (p) setPoster(p);

    // ---- affUrl (無ければ pageUrl)
    const au = normalizeText(obj.affUrl ?? obj.affiliateUrl ?? obj.pageUrl ?? obj.sourceUrl ?? "");
    if (au) setAffUrl(au);

    // ---- affLabel（未入力ならデフォ入れてもOK。不要ならこのif丸ごと消してOK）
    const al = normalizeText(obj.affLabel ?? obj.affiliateLabel ?? "");
    if (al) {
      setAffLabel(al);
    } else {
      // affUrlが入ってて、ラベルが空なら一旦「商品を見る」
      if (au && !normalizeText(affLabel)) setAffLabel("商品を見る");
    }

    // ---- genres
    const source =
      obj.genres ??
      obj.genre ??
      obj.tags ??
      obj.tag ??
      obj.hashtags ??
      obj.hashTags ??
      obj.categories ??
      obj.category ??
      [];

    let tokens: string[] = [];
    if (Array.isArray(source)) {
      tokens = source.map((x) => normalizeText(x)).filter(Boolean);
    } else if (typeof source === "string") {
      tokens = source
        .split(/[,\n]/g)
        .map((x) => normalizeText(x))
        .filter(Boolean);
    }

    const words = uniq(tokens.flatMap(splitWords));

    const noiseRe =
      /(キャンペーン|セール|おすすめ順|人気順|売上|評価|お気に入り|新着|予約|最新作|準新作|ポイント|ログアウト|購入済み|月額|レンタル|リスト|ブランドストア)/i;

    const cleanTokens = tokens.filter((x) => !noiseRe.test(x));
    const cleanWords = words.filter((x) => !noiseRe.test(x));

    const joinedRaw = cleanTokens.join(" ");
    const joinedRaw2 = `${joinedRaw} ${cleanWords.join(" ")}`.trim();
    const joinedN = normalizeKey(joinedRaw2);

    const matched: GenreKey[] = [];

    for (const tok of [...cleanTokens, ...cleanWords]) {
      const k = genreIndex.map.get(normalizeKey(tok));
      if (k) matched.push(k);
    }

    if (joinedN) {
      for (const k of genreIndex.allKeys) {
        const kk = normalizeKey(k);
        if (kk && joinedN.includes(kk)) matched.push(k);
      }
    }

    const lower = joinedRaw2.toLowerCase();
    for (const [k, ws] of jpToKey) {
      for (const w of ws) {
        if (lower.includes(String(w).toLowerCase())) {
          matched.push(k);
          break;
        }
      }
    }

    const picked = uniq(matched);
    if (picked.length > 0) {
      const next =
        picked.includes("other") && picked.length >= 2
          ? picked.filter((x) => x !== "other")
          : picked;
      setGenres(next as GenreKey[]);
    } else {
      setGenres(["other"]);
    }

    setGenreQuery("");
  }

  /** ✅ 追加：URLクエリ/ハッシュで受け取って自動反映（クリップボード不要）
   *  対応：
   *   - /admin?fanza=ENC
   *   - /admin?import=ENC
   *   - /admin#import=ENC
   */
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);

      // 1) search param 優先
      let enc = sp.get("fanza") || sp.get("import");

      // 2) hash fallback (#import=...)
      if (!enc) {
        const h = window.location.hash || "";
        const m = h.match(/(?:^|[#&])import=([^&]+)/);
        if (m?.[1]) enc = m[1];
      }

      if (!enc) return;

      const json = decodeURIComponent(enc);

      setFanzaJson(json);
      applyPasteText(json);

      showToast("取り込みOK（タイトル/URL/ジャンル反映）");

      // 同じ取り込みが繰り返し走らないようにURLを掃除
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    } catch {
      // 失敗しても静かに
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      const payloadGenres = (
        normalizedSelected.length ? normalizedSelected : (["other"] as GenreKey[])
      ).filter((g) => g !== ("ALL" as any));

      const r = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          poster: poster || undefined,
          affUrl: affUrl || undefined,
          affLabel: affLabel || undefined,
          genres: payloadGenres,
        }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        setErr(j?.error ?? `add failed (${r.status})`);
        return;
      }

      setTitle("");
      setUrl("");
      setPoster("");
      setAffUrl("");
      setAffLabel("");
      setGenres(["other"]);
      setGenreQuery("");
      setGenreOpen(false);
      setFanzaJson("");

      await load();
      showToast("追加OK");
    } finally {
      setBusy(false);
    }
  }

  const query = genreQuery.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!query) return GENRE_GROUPS;

    return GENRE_GROUPS
      .map((g) => {
        const items = g.items.filter((it) => {
          const t = `${it.key} ${it.label}`.toLowerCase();
          return t.includes(query);
        });
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      {/* ✅ トースト */}
      {toast ? (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-full bg-black/80 border border-white/10 text-white text-sm">
            {toast}
          </div>
        </div>
      ) : null}

      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin</h1>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/manage"
            className="px-4 py-2 rounded bg-white/10 text-white font-semibold"
          >
            登録済み（管理）
          </Link>

          <button
            className="px-4 py-2 rounded bg-white text-black font-semibold"
            onClick={() => load()}
            disabled={busy}
          >
            更新
          </button>
        </div>
      </header>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="font-bold mb-3">動画追加</h2>

        {/* ✅ FANZA抽出（JSON貼り付け） */}
        <div className="rounded-2xl bg-neutral-800 p-3 mb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">FANZA抽出（JSON貼り付け）</div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs rounded-full bg-white/10 text-white px-3 py-1"
                onClick={() => setFanzaJson("")}
              >
                クリア
              </button>
            </div>
          </div>

          <textarea
            ref={fanzaRef}
            className="mt-2 w-full h-24 px-3 py-2 rounded bg-neutral-900 outline-none text-xs leading-relaxed"
            placeholder="ここにJSONを貼る（貼った瞬間にタイトル/URL/ジャンル/affを反映）"
            value={fanzaJson}
            onChange={(e) => {
              const v = e.target.value;
              setFanzaJson(v);

              // JSONとしてパースできるなら即反映（末尾"}"判定より安定）
              try {
                JSON.parse(v);
                applyPasteText(v);
              } catch {
                // まだ途中なら無視
              }
            }}
          />
        </div>

        <form onSubmit={onAdd} className="grid gap-3">
          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="動画URL（mp4 / m3u8）"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          {/* ✅ ジャンル：開閉式 */}
          <div className="rounded-2xl bg-neutral-800 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">ジャンル（複数選択）</div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs rounded-full bg-white/10 text-white px-3 py-1"
                  onClick={clearGenres}
                >
                  リセット
                </button>

                <button
                  type="button"
                  className="text-xs rounded-full bg-white/10 text-white px-3 py-1"
                  onClick={() => setGenreOpen((v) => !v)}
                >
                  {genreOpen ? "閉じる" : "開く"}
                </button>
              </div>
            </div>

            {/* ✅ 選択済みを日本語ラベルで表示 */}
            <div className="mt-3 flex flex-wrap gap-2">
              {normalizedSelected.map((g) => (
                <span
                  key={g}
                  className="text-xs rounded-full bg-white/10 text-white px-3 py-1"
                  title={String(g)}
                >
                  {keyToLabel.get(String(g)) ?? String(g)}
                </span>
              ))}
            </div>

            {genreOpen ? (
              <div className="mt-3">
                <input
                  className="w-full px-3 py-2 rounded bg-neutral-900 outline-none"
                  placeholder="検索（例：office / 旅行）"
                  value={genreQuery}
                  onChange={(e) => setGenreQuery(e.target.value)}
                />

                <div className="mt-3 space-y-4">
                  {filteredGroups.map((g) => (
                    <div key={String(g.title)} className="space-y-2">
                      <div className="text-xs font-semibold text-white/80">{g.title}</div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {g.items.map((it) => {
                          const key = it.key as GenreKey;
                          const selected = normalizedSelected.includes(key);

                          return (
                            <button
                              key={String(key)}
                              type="button"
                              onClick={() => toggleGenre(key)}
                              className={[
                                "text-left rounded-xl px-3 py-2 text-sm border transition",
                                selected
                                  ? "bg-white text-black border-white"
                                  : "bg-black/20 text-white border-white/10 hover:border-white/30",
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
            ) : null}
          </div>

          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="ポスターURL（任意）"
            value={poster}
            onChange={(e) => setPoster(e.target.value)}
          />

          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="アフィURL（任意）"
            value={affUrl}
            onChange={(e) => setAffUrl(e.target.value)}
          />

          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="アフィ文言（任意：例「商品を見る」）"
            value={affLabel}
            onChange={(e) => setAffLabel(e.target.value)}
          />

          <button
            className="w-full px-4 py-3 rounded bg-white text-black font-bold"
            disabled={busy}
          >
            追加
          </button>

          {err && <p className="text-red-400 text-sm">{err}</p>}
        </form>
      </section>

      <section className="rounded-2xl bg-neutral-900 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold">登録済みは別ページで管理</div>
            <div className="text-sm text-white/60 mt-1">現在: {items.length} 件（更新で反映）</div>
          </div>

          <Link
            href="/admin/manage"
            className="px-4 py-2 rounded bg-white text-black font-bold"
          >
            管理ページへ
          </Link>
        </div>

        <Link
          href="/admin/analytics"
          className="block w-full text-center px-4 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/15 active:bg-white/15 border border-white/10"
        >
          ダッシュボード（Analytics）へ
        </Link>
      </section>
    </main>
  );
}
