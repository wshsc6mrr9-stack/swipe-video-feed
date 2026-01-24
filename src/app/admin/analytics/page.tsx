// src/app/admin/analytics/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  title: string;
  genres: string[];
  play: number;
  click: number;
  ctr: number;
  createdAt: number;
};

export default function AdminAnalyticsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<{ play: number; click: number; ctr: number }>({
    play: 0,
    click: 0,
    ctr: 0,
  });

  const [sort, setSort] = useState<"click" | "ctr" | "play" | "new">("click");
  const [genre, setGenre] = useState<string>("ALL");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" });
      const json = await res.json();
      setTotals(json?.totals ?? { play: 0, click: 0, ctr: 0 });
      setRows(Array.isArray(json?.rows) ? json.rows : []);
    })();
  }, []);

  const genreOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => (r.genres ?? []).forEach((g) => g && set.add(String(g))));
    return ["ALL", ...Array.from(set)];
  }, [rows]);

  const view = useMemo(() => {
    let list = rows.slice();

    if (genre !== "ALL") {
      list = list.filter((r) => (r.genres ?? []).includes(genre));
    }

    list.sort((a, b) => {
      if (sort === "click") return (b.click ?? 0) - (a.click ?? 0);
      if (sort === "play") return (b.play ?? 0) - (a.play ?? 0);
      if (sort === "ctr") return (b.ctr ?? 0) - (a.ctr ?? 0);
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });

    return list;
  }, [rows, sort, genre]);

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">Analytics</h1>
        <Link href="/admin" className="rounded-xl bg-white/10 px-3 py-2 text-sm">
          管理に戻る
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Card title="再生（合計）" value={String(totals.play ?? 0)} />
        <Card title="クリック（合計）" value={String(totals.click ?? 0)} />
        <Card title="CTR（合計）" value={pct(totals.ctr ?? 0)} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <select
          className="rounded-xl bg-white/10 px-3 py-2 text-sm"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        >
          {genreOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <button onClick={() => setSort("click")} className={btn(sort === "click")}>
          クリック順
        </button>
        <button onClick={() => setSort("ctr")} className={btn(sort === "ctr")}>
          CTR順
        </button>
        <button onClick={() => setSort("play")} className={btn(sort === "play")}>
          再生順
        </button>
        <button onClick={() => setSort("new")} className={btn(sort === "new")}>
          新しい順
        </button>

        <button
          onClick={() => location.reload()}
          className="ml-auto rounded-xl bg-white/10 px-3 py-2 text-sm"
        >
          更新
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[1.6fr_0.8fr_0.6fr_0.6fr_0.6fr] gap-2 bg-white/5 px-3 py-2 text-xs text-white/70">
          <div>タイトル</div>
          <div>ジャンル</div>
          <div className="text-right">再生</div>
          <div className="text-right">クリック</div>
          <div className="text-right">CTR</div>
        </div>

        {view.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1.6fr_0.8fr_0.6fr_0.6fr_0.6fr] gap-2 px-3 py-3 text-sm border-t border-white/10"
          >
            <div className="truncate">
              <div className="font-bold truncate">{r.title || r.id}</div>
              <div className="text-xs text-white/50 truncate">{r.id}</div>
            </div>

            <div className="text-xs text-white/70">
              {(r.genres ?? []).slice(0, 3).join(", ") || "-"}
            </div>

            <div className="text-right tabular-nums">{r.play ?? 0}</div>
            <div className="text-right tabular-nums">{r.click ?? 0}</div>
            <div className="text-right tabular-nums">{pct(r.ctr ?? 0)}</div>
          </div>
        ))}

        {!view.length && (
          <div className="p-6 text-center text-white/60">データがありません</div>
        )}
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{title}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function btn(active: boolean) {
  return [
    "rounded-xl px-3 py-2 text-sm",
    active ? "bg-white text-black font-extrabold" : "bg-white/10 text-white",
  ].join(" ");
}
