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

  // 🚨 初期ソートを 'play' (再生数) に設定
  const [sort, setSort] = useState<"play" | "click" | "ctr" | "createdAt">("play");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // 🚀 パイプライン対応したAPIからデータを取得
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

  // ジャンル一覧の抽出
  const genreOptions = useMemo(() => {
    if (!data?.rows) return ["ALL"];
    const set = new Set<string>();
    data.rows.forEach((r) => r.genres?.forEach((g) => g && set.add(String(g))));
    return ["ALL", ...Array.from(set)];
  }, [data]);

  // 🚀 【重要】ここがボタン連動の並び替えロジック
  // sort ステートが変わるたびに、この中の計算が走り、画面が更新されます
  const viewItems = useMemo(() => {
    if (!data?.rows) return [];
    let list = [...data.rows];

    // 1. ジャンルフィルタ
    if (selectedGenre !== "ALL") {
      list = list.filter((r) => r.genres?.includes(selectedGenre));
    }

    // 2. ソート実行
    list.sort((a: any, b: any) => {
      const valA = a[sort] ?? 0;
      const valB = b[sort] ?? 0;
      return valB - valA; // 降順（大きい順）
    });

    return list;
  }, [data, sort, selectedGenre]);

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-black italic tracking-widest">
        ANALYZING...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20 select-none">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Realtime Stats</p>
          </div>
        </div>
        <Link href="/admin" className="rounded-2xl bg-white text-black px-5 py-2 text-xs font-black transition active:scale-95">
          BACK
        </Link>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <StatCard title="Total Plays" value={data?.totals.play.toLocaleString() ?? "0"} unit="回" />
        <StatCard title="Total Clicks" value={data?.totals.click.toLocaleString() ?? "0"} unit="件" />
        <StatCard title="Avg. CTR" value={pct(data?.totals.ctr ?? 0)} unit="" highlight />
      </div>

      {/* 🚀 操作パネル：ここがボタン群 */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {/* onClickでsetSortを呼ぶことで、viewItemsの再計算をトリガーします */}
          <button onClick={() => setSort("play")} className={btn(sort === "play")}>再生数TOP</button>
          <button onClick={() => setSort("click")} className={btn(sort === "click")}>クリックTOP</button>
          <button onClick={() => setSort("ctr")} className={btn(sort === "ctr")}>効率TOP</button>
          <button onClick={() => setSort("createdAt")} className={btn(sort === "createdAt")}>最新順</button>
          
          <button 
            onClick={() => {
              setData(null);
              loadStats();
            }} 
            className="ml-auto bg-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest active:scale-95 transition"
          >
            REFRESH
          </button>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
          <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Genre Filter:</span>
          <select
            className="flex-1 bg-transparent text-sm font-bold outline-none appearance-none"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            {genreOptions.map((g) => (
              <option key={g} value={g} className="bg-neutral-900 text-white">{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* リスト表示 */}
      <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-neutral-900/40">
        <div className="grid grid-cols-[1.5fr_1fr_0.6fr_0.6fr_0.6fr] gap-2 bg-white/5 px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
          <div>Content</div>
          <div>Genres</div>
          <div className="text-right">Plays</div>
          <div className="text-right text-orange-400">Clicks</div>
          <div className="text-right text-indigo-400">CTR</div>
        </div>

        <div className="divide-y divide-white/5">
          {viewItems.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[1.5fr_1fr_0.6fr_0.6fr_0.6fr] gap-2 px-6 py-5 text-sm hover:bg-white/[0.03] transition">
              <div className="truncate">
                <div className="font-bold truncate">
                  <span className="text-[10px] text-white/20 mr-3 font-mono">{i + 1}</span>
                  {r.title || "No Title"}
                </div>
                <div className="text-[9px] text-white/20 font-mono mt-1 uppercase">{r.id}</div>
              </div>
              <div className="flex flex-wrap gap-1 items-center overflow-hidden">
                {r.genres?.slice(0, 2).map(g => (
                  <span key={g} className="text-[8px] bg-white/5 px-2 py-0.5 rounded-full text-white/50 font-bold border border-white/5">{g}</span>
                ))}
              </div>
              <div className="text-right tabular-nums font-medium">{r.play.toLocaleString()}</div>
              <div className="text-right tabular-nums font-bold text-orange-400/80">{r.click.toLocaleString()}</div>
              <div className="text-right tabular-nums font-black text-indigo-400">{pct(r.ctr)}</div>
            </div>
          ))}
        </div>

        {viewItems.length === 0 && (
          <div className="p-24 text-center text-white/20 font-black italic tracking-widest text-sm uppercase">
            No Data Found
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, highlight }: any) {
  return (
    <div className={`rounded-[2rem] border border-white/10 p-6 ${highlight ? 'bg-indigo-600 shadow-xl shadow-indigo-600/20' : 'bg-neutral-900'}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{title}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-black tracking-tighter tabular-nums">{value}</span>
        <span className="text-xs font-bold text-white/20">{unit}</span>
      </div>
    </div>
  );
}

function btn(active: boolean) {
  return `rounded-xl px-4 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all ${
    active ? "bg-white text-black shadow-lg" : "bg-white/5 text-white/30 hover:bg-white/10"
  }`;
}