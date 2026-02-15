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

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<{
    totals: { play: number; click: number; ctr: number };
    rows: Row[];
  } | null>(null);

  const [sort, setSort] = useState<"play" | "click" | "ctr" | "createdAt">("play");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // ---------------------------
  // 🚀 最新の統計データを取得
  // ---------------------------
  async function loadStats() {
    setLoading(true);
    try {
      // 先ほど作った集計用APIを叩く
      const res = await fetch("/api/stats/summary", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch (e) {
      console.error("Analytics Load Error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  // ジャンル一覧の抽出
  const genreOptions = useMemo(() => {
    if (!data?.rows) return ["ALL"];
    const set = new Set<string>();
    data.rows.forEach((r) => r.genres?.forEach((g) => g && set.add(String(g))));
    return ["ALL", ...Array.from(set)];
  }, [data]);

  // 並び替えとフィルタリング
  const viewItems = useMemo(() => {
    if (!data?.rows) return [];
    let list = [...data.rows];

    if (selectedGenre !== "ALL") {
      list = list.filter((r) => r.genres?.includes(selectedGenre));
    }

    list.sort((a: any, b: any) => (b[sort] ?? 0) - (a[sort] ?? 0));
    return list;
  }, [data, sort, selectedGenre]);

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  if (loading && !data) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center font-bold">集計データを読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">DASHBOARD</h1>
          <p className="text-xs text-white/40">サイト全体のパフォーマンス</p>
        </div>
        <Link href="/admin" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold">
          管理に戻る
        </Link>
      </div>

      {/* 🚀 メイン統計カード */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard 
          title="総再生数" 
          value={data?.totals.play.toLocaleString() ?? "0"} 
          unit="回"
          desc="サイト内の全動画再生"
        />
        <StatCard 
          title="総クリック" 
          value={data?.totals.click.toLocaleString() ?? "0"} 
          unit="件"
          desc="アフィリンク移動数"
        />
        <StatCard 
          title="平均CTR" 
          value={pct(data?.totals.ctr ?? 0)} 
          unit="" 
          desc="クリック率の平均"
          highlight
        />
      </div>

      {/* フィルタ・ソート操作 */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSort("play")} className={btn(sort === "play")}>再生数TOP</button>
          <button onClick={() => setSort("click")} className={btn(sort === "click")}>クリックTOP</button>
          <button onClick={() => setSort("ctr")} className={btn(sort === "ctr")}>効率TOP (CTR)</button>
          <button onClick={() => setSort("createdAt")} className={btn(sort === "createdAt")}>最新順</button>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 font-bold">ジャンル絞り込み:</span>
          <select
            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-bold outline-none border border-white/10"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            {genreOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button onClick={loadStats} className="ml-auto text-xs bg-white text-black px-3 py-1.5 rounded-lg font-black">更新</button>
        </div>
      </div>

      {/* 🚀 動画別ランキングリスト */}
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/50">
        <div className="grid grid-cols-[1.5fr_1fr_0.6fr_0.6fr_0.6fr] gap-2 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/40">
          <div>コンテンツ名</div>
          <div>ジャンル</div>
          <div className="text-right">再生</div>
          <div className="text-right">クリック</div>
          <div className="text-right">CTR</div>
        </div>

        <div className="divide-y divide-white/5">
          {viewItems.map((r, i) => (
            <div
              key={r.id}
              className="grid grid-cols-[1.5fr_1fr_0.6fr_0.6fr_0.6fr] gap-2 px-4 py-4 text-sm hover:bg-white/[0.02] transition"
            >
              <div className="truncate">
                <div className="font-bold truncate flex items-center gap-2">
                  <span className="text-[10px] text-white/20 w-4">{i + 1}</span>
                  {r.title || "無題の動画"}
                </div>
                <div className="text-[10px] text-white/30 font-mono mt-0.5">{r.id}</div>
              </div>

              <div className="flex flex-wrap gap-1 items-center">
                {r.genres?.slice(0, 2).map(g => (
                  <span key={g} className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-white/60">{g}</span>
                )) || "-"}
              </div>

              <div className="text-right tabular-nums font-bold">{r.play.toLocaleString()}</div>
              <div className="text-right tabular-nums font-bold text-orange-400">{r.click.toLocaleString()}</div>
              <div className="text-right tabular-nums font-black text-indigo-400">{pct(r.ctr)}</div>
            </div>
          ))}
        </div>

        {viewItems.length === 0 && (
          <div className="p-20 text-center text-white/20 font-bold">データが見つかりません</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, desc, highlight }: any) {
  return (
    <div className={`rounded-3xl border border-white/10 p-5 ${highlight ? 'bg-indigo-600' : 'bg-neutral-900'}`}>
      <div className="text-[10px] font-black uppercase tracking-widest text-white/50">{title}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-black tracking-tighter tabular-nums">{value}</span>
        <span className="text-xs font-bold text-white/40">{unit}</span>
      </div>
      <p className="mt-2 text-[9px] text-white/30 font-bold leading-none">{desc}</p>
    </div>
  );
}

function btn(active: boolean) {
  return `rounded-xl px-4 py-2 text-xs font-black transition ${
    active ? "bg-white text-black shadow-lg shadow-white/10 scale-105" : "bg-white/5 text-white/40 hover:bg-white/10"
  }`;
}