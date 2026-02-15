"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
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

  // 🚨 初期ソートを 'play' に設定
  const [sort, setSort] = useState<"play" | "click" | "ctr" | "createdAt">("play");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // 🚀 データ取得関数を useCallback で安定化
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
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
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ジャンル一覧
  const genreOptions = useMemo(() => {
    if (!data?.rows) return ["ALL"];
    const set = new Set<string>();
    data.rows.forEach((r) => r.genres?.forEach((g) => g && set.add(String(g))));
    return ["ALL", ...Array.from(set)];
  }, [data]);

  // 🚀 【重要】ここが並び替えの本番ロジック
  const viewItems = useMemo(() => {
    if (!data?.rows) return [];
    let list = [...data.rows];

    // 1. ジャンルで絞り込み
    if (selectedGenre !== "ALL") {
      list = list.filter((r) => r.genres?.includes(selectedGenre));
    }

    // 2. 指定されたソートキーで並び替え
    list.sort((a: any, b: any) => {
      const valA = a[sort] ?? 0;
      const valB = b[sort] ?? 0;
      return valB - valA; // 降順（大きい順）
    });

    return list;
  }, [data, sort, selectedGenre]); // sort や selectedGenre が変わるたびに再計算される

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  if (loading && !data) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center font-bold italic tracking-widest">ANALYZING...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20 select-none">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter">DASHBOARD</h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Live Performance Data</p>
          </div>
        </div>
        <Link href="/admin" className="rounded-2xl bg-white text-black px-5 py-2 text-xs font-black hover:scale-105 transition">
          EXIT
        </Link>
      </div>

      {/* 🚀 サイト全体の数字カード */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <StatCard title="Total Plays" value={data?.totals.play.toLocaleString() ?? "0"} unit="回" />
        <StatCard title="Total Clicks" value={data?.totals.click.toLocaleString() ?? "0"} unit="件" />
        <StatCard title="Avg. CTR" value={pct(data?.totals.ctr ?? 0)} unit="" highlight />
      </div>

      {/* 🚀 操作パネル */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {/* ボタンクリックで setSort を実行 -> viewItems が自動で再計算される */}
          <button onClick={() => setSort("play")} className={btn(sort === "play")}>再生数TOP</button>
          <button onClick={() => setSort("click")} className={btn(sort === "click")}>クリックTOP</button>
          <button onClick={() => setSort("ctr")} className={btn(sort === "ctr")}>効率TOP</button>
          <button onClick={() => setSort("createdAt")} className={btn(sort === "createdAt")}>最新順</button>
          
          <button 
            onClick={() => {
              setData(null); // 一旦消して
              loadStats();   // 再取得
            }} 
            className="ml-auto flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded-xl text-xs font-black active:scale-95 transition"
          >
            REFRESH
          </button>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
          <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Filter by Genre:</span>
          <select
            className="flex-1 bg-transparent text-sm font-bold outline-none cursor-pointer"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            {genreOptions.map((g) => (
              <option key={g} value={g} className="bg-neutral-900">{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 🚀 ランキング表 */}
      <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-neutral-900/40 backdrop-blur-md">
        <div className="grid grid-cols-[1.5fr_1fr_0.6fr_0.6fr_0.6fr] gap-2 bg-white/5 px-5 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
          <div>Content</div>
          <div>Genres</div>
          <div className="text-right">Plays</div>
          <div className="text-right text-orange-400">Clicks</div>
          <div className="text-right text-indigo-400">CTR</div>
        </div>

        <div className="divide-y divide-white/5">
          {viewItems.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[1.5fr_1fr_0.6fr_0.6fr_0.6fr] gap-2 px-5 py-5 text-sm hover:bg-white/[0.03] transition group">
              <div className="truncate">
                <div className="font-bold truncate group-hover:text-indigo-400 transition">
                  <span className="text-[10px] text-white/20 mr-2 font-mono">{String(i + 1).padStart(2, '0')}</span>
                  {r.title || "Untitled Video"}
                </div>
                <div className="text-[9px] text-white/20 font-mono mt-1 uppercase tracking-tighter">{r.id}</div>
              </div>
              <div className="flex flex-wrap gap-1 items-center overflow-hidden">
                {r.genres?.slice(0, 2).map(g => (
                  <span key={g} className="text-[8px] border border-white/10 px-2 py-0.5 rounded-full text-white/40 font-bold whitespace-nowrap">{g}</span>
                ))}
              </div>
              <div className="text-right tabular-nums font-medium">{r.play.toLocaleString()}</div>
              <div className="text-right tabular-nums font-bold text-orange-400/80">{r.click.toLocaleString()}</div>
              <div className="text-right tabular-nums font-black text-indigo-400">{pct(r.ctr)}</div>
            </div>
          ))}
        </div>

        {viewItems.length === 0 && (
          <div className="p-24 text-center">
            <p className="text-white/20 font-black italic tracking-widest text-sm uppercase">No Data Available</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, highlight }: any) {
  return (
    <div className={`rounded-[2rem] border border-white/10 p-6 transition-transform hover:scale-[1.02] ${highlight ? 'bg-indigo-600 shadow-2xl shadow-indigo-600/20' : 'bg-neutral-900'}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{title}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-black tracking-tighter tabular-nums">{value}</span>
        <span className="text-xs font-bold text-white/20">{unit}</span>
      </div>
    </div>
  );
}

function btn(active: boolean) {
  return `rounded-xl px-4 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 ${
    active ? "bg-white text-black shadow-xl shadow-white/5" : "bg-white/5 text-white/30 hover:bg-white/10"
  }`;
}