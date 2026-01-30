// src/app/admin/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
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

function normalizeGenreToken(s: any): string {
  return String(s ?? "")
    .trim()
    .replace(/^#/, "")
    .replace(/[　]/g, " ")
    .replace(/\s+/g, " ");
}

// ✅ クリップボードコピー（失敗時フォールバック）
async function copyText(label: string, text: string) {
  const t = (text ?? "").trim();
  if (!t) {
    alert(`${label} が空やで`);
    return;
  }
  try {
    await navigator.clipboard.writeText(t);
    // うるさくない程度に
    alert(`${label} をコピーした`);
  } catch {
    // Safari等の権限で失敗することがある
    prompt(`${label} を手動でコピーして`, t);
  }
}

export default function AdminPage() {
  const [items, setItems] = useState<VideoItem[]>([]);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [affUrl, setAffUrl] = useState("");
  const [affLabel, setAffLabel] = useState("");

  const [genres, setGenres] = useState<GenreKey[]>(["other"]);
  const [genreQuery, setGenreQuery] = useState("");
  const [genreOpen, setGenreOpen] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ✅ FANZA抽出(JSON)貼り付け
  const [importText, setImportText] = useState("");

  const genreCatalog = useMemo(() => {
    const all: { key: GenreKey; label: string; labelNorm: string }[] = [];
    for (const g of GENRE_GROUPS) {
      for (const it of g.items) {
        all.push({
          key: it.key as GenreKey,
          label: it.label,
          labelNorm: normalizeGenreToken(it.label),
        });
      }
    }
    return all;
  }, []);

  function toGenreKeys(raw: any): GenreKey[] {
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const tokens: string[] = [];
    for (const v of arr) {
      const str = String(v ?? "");

      const tags = str.match(/#[^\s#]+/g) ?? [];
      if (tags.length) {
        for (const t of tags) tokens.push(normalizeGenreToken(t));
        const head = normalizeGenreToken(str.split("#")[0]);
        if (head) tokens.push(head);
        continue;
      }

      normalizeGenreToken(str)
        .split(/[,\s]+/g)
        .map(normalizeGenreToken)
        .filter(Boolean)
        .forEach((x) => tokens.push(x));
    }

    const uniqTokens = uniq(tokens).filter((x) => x && x !== "ALL");
    if (!uniqTokens.length) return ["other"];

    const out: GenreKey[] = [];

    for (const t of uniqTokens) {
      const tNorm = normalizeGenreToken(t);

      const keyHit = genreCatalog.find((x) => String(x.key) === tNorm);
      if (keyHit) {
        out.push(keyHit.key);
        continue;
      }

      const labelExact = genreCatalog.find((x) => x.labelNorm === tNorm);
      if (labelExact) {
        out.push(labelExact.key);
        continue;
      }

      const candidates = genreCatalog
        .filter((x) => x.labelNorm.length >= 2)
        .filter((x) => tNorm.includes(x.labelNorm) || x.labelNorm.includes(tNorm))
        .sort((a, b) => b.labelNorm.length - a.labelNorm.length);

      if (candidates[0]) out.push(candidates[0].key);
    }

    let unique = uniq(out) as GenreKey[];
    if (!unique.length) unique = ["other"];

    if (unique.length >= 2 && unique.includes("other")) {
      unique = unique.filter((x) => x !== "other") as GenreKey[];
      if (!unique.length) unique = ["other"];
    }

    return unique;
  }

  function applyImport(raw: string) {
    try {
      const o = JSON.parse(raw);

      if (typeof o?.title === "string") setTitle(o.title.trim());

      // ✅ affUrl / affiliateUrl（入ってたら反映）
      const aurl = o?.affUrl ?? o?.affiliateUrl ?? "";
      if (typeof aurl === "string" && aurl.trim()) setAffUrl(aurl.trim());

      const alabel = o?.affLabel ?? o?.affiliateLabel ?? "";
      if (typeof alabel === "string" && alabel.trim()) setAffLabel(alabel.trim());

      const p = o?.poster ?? "";
      if (typeof p === "string" && p.trim()) setPoster(p.trim());

      const gRaw = o?.genres ?? o?.genre ?? [];
      let gKeys = toGenreKeys(gRaw);

      if (gKeys.length >= 2 && gKeys.includes("other")) {
        gKeys = gKeys.filter((x) => x !== "other") as GenreKey[];
        if (!gKeys.length) gKeys = ["other"];
      }

      setGenres(gKeys);
      setGenreQuery("");

      alert("取込OK：タイトル/ジャンル/アフィ(あれば)を反映したで");
    } catch {
      alert("JSONが読めない：FANZA抽出のJSONをそのまま貼ってな");
    }
  }

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
      setImportText("");

      await load();
    } finally {
      setBusy(false);
    }
  }

  const query = genreQuery.trim().toLowerCase();
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

  // ✅ 入力欄（右側にコピーボタン付ける用）
  function Field({
    label,
    value,
    onChange,
    placeholder,
    copyLabel,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    copyLabel: string;
  }) {
    return (
      <div className="grid gap-1">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/70">{label}</div>
          <button
            type="button"
            className="text-xs rounded-full bg-white/10 text-white px-3 py-1"
            onClick={() => copyText(copyLabel, value)}
          >
            コピー
          </button>
        </div>

        <input
          className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
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

        {/* ✅ FANZA抽出（JSON貼り付け→自動入力） */}
        <div className="border border-white/10 rounded-2xl bg-neutral-900/60 p-3 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold">FANZA抽出（JSON貼り付け）</div>
            <button
              type="button"
              className="text-xs rounded-full bg-white/10 text-white px-3 py-1"
              onClick={() => copyText("JSON", importText)}
            >
              JSONコピー
            </button>
          </div>

          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            onPaste={(e) => {
              const t = e.clipboardData.getData("text/plain");
              setImportText(t);
              applyImport(t);
            }}
            placeholder="ここにJSONを貼る（貼った瞬間にタイトル/ジャンル/アフィ(あれば)を自動入力）"
            className="w-full h-28 border border-white/10 rounded-xl bg-neutral-800 outline-none p-2 mt-2"
          />

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="px-3 py-2 rounded bg-white text-black font-bold"
              onClick={() => applyImport(importText)}
              disabled={!importText.trim()}
            >
              取込
            </button>

            <button
              type="button"
              className="px-3 py-2 rounded bg-white/10 text-white font-semibold"
              onClick={() => setImportText("")}
              disabled={!importText.trim()}
            >
              クリア
            </button>
          </div>

          <div className="text-xs text-white/60 mt-2">
            ※ ここは「作品情報」用。動画URL（mp4/m3u8）は別欄に手貼りして「追加」。
          </div>
        </div>

        <form onSubmit={onAdd} className="grid gap-3">
          <Field
            label="タイトル"
            value={title}
            onChange={setTitle}
            placeholder="タイトル"
            copyLabel="タイトル"
          />

          <Field
            label="動画URL（mp4 / m3u8）"
            value={url}
            onChange={setUrl}
            placeholder="動画URL（mp4 / m3u8）"
            copyLabel="動画URL"
          />

          {/* ✅ ジャンル：開閉式（ただし選択では閉じない） */}
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

            <div className="mt-3 flex flex-wrap gap-2">
              {normalizedSelected.map((g) => (
                <span
                  key={g}
                  className="text-xs rounded-full bg-white/10 text-white px-3 py-1"
                >
                  {g}
                </span>
              ))}
            </div>

            {genreOpen ? (
              <div className="mt-3">
                <input
                  className="w-full px-3 py-2 rounded bg-neutral-900 outline-none"
                  placeholder="検索（例：オタク / office / 旅行）"
                  value={genreQuery}
                  onChange={(e) => setGenreQuery(e.target.value)}
                />

                <div className="space-y-4 mt-3">
                  {filteredGroups.map((g) => (
                    <div key={String(g.title)} className="space-y-2">
                      <div className="text-xs font-semibold text-white/80">
                        {g.title}
                      </div>

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

          <Field
            label="ポスターURL（任意）"
            value={poster}
            onChange={setPoster}
            placeholder="ポスターURL（任意）"
            copyLabel="ポスターURL"
          />

          <Field
            label="アフィURL（任意）"
            value={affUrl}
            onChange={setAffUrl}
            placeholder="アフィURL（任意）"
            copyLabel="アフィURL"
          />

          <Field
            label="アフィ文言（任意）"
            value={affLabel}
            onChange={setAffLabel}
            placeholder="アフィ文言（任意：例「商品を見る」）"
            copyLabel="アフィ文言"
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
            <div className="text-sm text-white/60 mt-1">
              現在: {items.length} 件（更新で反映）
            </div>
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
