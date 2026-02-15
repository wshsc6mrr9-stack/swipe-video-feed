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

  const [sort, setSort] = useState<"play" | "click" | "ctr" | "createdAt">("play");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

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

  const genreOptions = useMemo(() => {
    if (!data?.rows) return ["ALL"];
    const set = new Set<string>();
    data.rows.forEach((r) => r.genres?.forEach((g) => g && set.add(String(g))));
    return ["ALL", ...Array.from(set)];
  }, [data]);

  // 🚀 ここが並び替えの心臓部です
  const viewItems = useMemo(() => {
    if (!data?.rows) return [];
    
    // 元のデータを壊さないようにコピー
    let list = [...data.rows];

    // ジャンルフィルタ
    if (selectedGenre !== "ALL") {
      list = list.filter((r) => r.genres?.includes(selectedGenre));
    }

    // 並び替え実行
    list.sort((a, b) => {
      const valA = Number(a[sort] ?? 0);
      const valB = Number(b[sort] ?? 0);
      // 大きい順に並べる
      if (valB > valA) return 1;
      if (valB < valA) return -1;
      return 0;
    });

    return list;
  }, [data, sort, selectedGenre]); // sortが変わるたびにここが動きます

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  if (loading && !data) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black italic">ANALYZING...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20 select-none">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">Dashboard</h1>
        <Link href="/admin" className="rounded-2xl bg-white text-black px-5 py-2 text-xs font-black">BACK</Link>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-10">
        <StatCard title="Total Plays" value={data?.totals.play.toLocaleString() ?? "0"} unit="回" />
        <StatCard title="Total Clicks" value={data?.totals.click.toLocaleString() ?? "0"} unit="件" />
        <StatCard title="Avg. CTR" value={pct(data?.totals.ctr ?? 0)} highlight />
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {/* ✅ onClickで確実にソート状態を切り替える */}
          <button onClick={() => setSort("play")} className={btn(sort === "play")}>再生数TOP</button>
          <button onClick={() => setSort("click")} className={btn(sort === "click")}>クリックTOP</button>
          <button onClick={() => setSort("ctr")} className={btn(sort === "ctr")}>効率TOP</button>
          <button onClick={() => setSort("createdAt")} className={btn(sort === "createdAt")}>最新順</button>
          
          <button onClick={() => { setData(null); loadStats(); }} className="ml-auto bg-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black">REFRESH</button>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
          <span className="text-[10px] text-white/40 font-black uppercase">Genre Filter:</span>
          <select className="flex-1 bg-transparent text-sm font-bold outline-none" value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}>
            {genreOptions.map((g) => <option key={g} value={g} className="bg-neutral-900">{g}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-neutral-900/40">
        <div className="grid grid-cols-[1.5fr_1fr_0.6fr_0.6fr_0.6fr] gap-2 bg-white/5 px-6 py-4 text-[9px] font-black uppercase text-white/30">
          <div>Content</div>
          <div>Genres</div>
          <div className="text-right">Plays</div>
          <div className="text-right text-orange-400">Clicks</div>
          <div className="text-right text-indigo-400">CTR</div>
        </div>

        <div className="divide-y divide-white/5">
          {viewItems.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[1.5fr_1fr_0.6fr_0.6fr_0.6fr] gap-2 px-6 py-5 text-sm hover:bg-white/[0.03]">
              <div className="truncate">
                <div className="font-bold truncate"><span className="text-[10px] text-white/20 mr-3">{i + 1}</span>{r.title}</div>
                <div className="text-[9px] text-white/20 font-mono mt-1 uppercase">{r.id}</div>
              </div>
              <div className="flex flex-wrap gap-1 items-center overflow-hidden">
                {r.genres?.slice(0, 2).map(g => <span key={g} className="text-[8px] bg-white/5 px-2 py-0.5 rounded-full text-white/50 border border-white/5">{g}</span>)}
              </div>
              <div className="text-right tabular-nums">{r.play.toLocaleString()}</div>
              <div className="text-right tabular-nums text-orange-400/80">{r.click.toLocaleString()}</div>
              <div className="text-right tabular-nums text-indigo-400 font-black">{pct(r.ctr)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, highlight }: any) {
  return (
    <div className={`rounded-[2rem] border border-white/10 p-6 ${highlight ? 'bg-indigo-600 shadow-xl shadow-indigo-600/20' : 'bg-neutral-900'}`}>
      <div className="text-[9px] font-black uppercase text-white/40">{title}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-black tabular-nums">{value}</span>
        <span className="text-xs font-bold text-white/20">{unit}</span>
      </div>
    </div>
  );
}

function btn(active: boolean) {
  return `rounded-xl px-4 py-2.5 text-[10px] font-black uppercase transition-all ${active ? "bg-white text-black" : "bg-white/5 text-white/30 hover:bg-white/10"}`;
}