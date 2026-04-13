"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";

const AUTO_REFRESH_SEC = 30;
const CACHE_KEY = "analytics_cache_v1";

function saveCache(d: any) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: d, at: Date.now() })); } catch {}
}
function loadCache(): any | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, at } = JSON.parse(raw);
    // 10分以内のキャッシュのみ使う
    if (Date.now() - at > 10 * 60 * 1000) return null;
    return data;
  } catch { return null; }
}

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

  const [sort, setSort] = useState<"play" | "click" | "ctr">("play");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false); // キャッシュ表示中フラグ
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SEC);
  const countdownRef = useRef<number | null>(null);

  const applyJson = useCallback((json: any) => {
    if (!json?.ok) return false;
    const normalizedRows = (json.rows || []).map((r: any) => ({
      ...r,
      play:      Number(r.play      || 0),
      click:     Number(r.click     || 0),
      ctr:       Number(r.ctr       || 0),
      createdAt: Number(r.createdAt || 0),
    }));
    const d = {
      totals: {
        play:  Number(json.totals?.play  || 0),
        click: Number(json.totals?.click || 0),
        ctr:   Number(json.totals?.ctr   || 0),
      },
      rows: normalizedRows,
    };
    setData(d);
    return d;
  }, []);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/stats/summary", { cache: "no-store" });
      const json = await res.json();
      const d = applyJson(json);
      if (d) {
        saveCache(json);      // 次回起動用にキャッシュ保存
        setIsStale(false);
        setLastUpdated(new Date());
        setCountdown(AUTO_REFRESH_SEC);
      }
    } catch (e) {
      console.error("Analytics Load Error:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [applyJson]);

  // 初回：まずlocalStorageキャッシュを即表示 → 裏でAPI取得
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      applyJson(cached);
      setIsStale(true);   // 古いデータである印
      setLoading(false);
      loadStats(true);    // サイレントで最新取得
    } else {
      loadStats(false);   // キャッシュなし → 通常ロード
    }
  }, [applyJson, loadStats]);

  // 30秒ごとに自動更新（バックグラウンドでサイレント更新）
  useEffect(() => {
    const interval = setInterval(() => loadStats(true), AUTO_REFRESH_SEC * 1000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // カウントダウン表示
  useEffect(() => {
    setCountdown(AUTO_REFRESH_SEC);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = window.setInterval(() => {
      setCountdown((c) => (c <= 1 ? AUTO_REFRESH_SEC : c - 1));
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [lastUpdated]);

  const genreOptions = useMemo(() => {
    if (!data?.rows) return ["ALL"];
    const set = new Set<string>();
    data.rows.forEach((r) => r.genres?.forEach((g) => g && set.add(String(g))));
    return ["ALL", ...Array.from(set)];
  }, [data]);

  // 🚀 強力なソートロジック
  const viewItems = useMemo(() => {
    if (!data?.rows) return [];
    
    let list = [...data.rows];

    // ジャンルフィルタ
    if (selectedGenre !== "ALL") {
      list = list.filter((r) => r.genres?.includes(selectedGenre));
    }

    // 並び替え実行
    list.sort((a, b) => {
      const valA = Number(a[sort] ?? 0);
      const valB = Number(b[sort] ?? 0);

      // 数値に差がある場合は降順（大きい順）
      if (valB !== valA) {
        return valB - valA;
      }
      
      // 数値が同じ（0同士など）場合は、IDで固定してガタつきを防ぐ
      // または、新しい順に並べる
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return list;
  }, [data, sort, selectedGenre]);

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  // データが全くない場合だけフルスクリーンローダー（通常は一瞬で消える）
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.8)", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p className="text-[11px] text-white/30 font-mono tracking-widest">LOADING ANALYTICS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20 select-none">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">Dashboard</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[10px] text-indigo-500 font-bold tracking-widest uppercase italic">Ranking: {sort}</p>
            {isStale && (
              <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold animate-pulse">更新中...</span>
            )}
            {lastUpdated && !isStale && (
              <p className="text-[10px] text-white/30 font-mono">
                {lastUpdated.toLocaleTimeString("ja-JP")} · {countdown}s
              </p>
            )}
          </div>
        </div>
        <Link href="/admin" className="rounded-2xl bg-white text-black px-5 py-2 text-xs font-black transition active:scale-95">
          BACK
        </Link>
      </header>

      {/* 統計サマリー */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <StatCard title="Total Plays" value={data?.totals.play.toLocaleString() ?? "0"} unit="回" />
        <StatCard title="Total Clicks" value={data?.totals.click.toLocaleString() ?? "0"} unit="件" />
        <StatCard title="Avg. CTR" value={pct(data?.totals.ctr ?? 0)} highlight />
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSort("play")} className={btn(sort === "play")}>再生順</button>
          <button onClick={() => setSort("click")} className={btn(sort === "click")}>クリック順</button>
          <button onClick={() => setSort("ctr")} className={btn(sort === "ctr")}>効率順</button>
          
          <button
            onClick={() => loadStats()}
            disabled={loading}
            className="ml-auto bg-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest active:scale-95 transition disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? (
              <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            ) : "↺"} REFRESH
          </button>
        </div>
        
        {/* ジャンルフィルタ */}
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
          <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Genre:</span>
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

      {/* 動画別データリスト */}
      <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-neutral-900/40 backdrop-blur-sm">
        <div className="grid grid-cols-[1.5fr_1fr_0.6fr_0.6fr_0.6fr] gap-2 bg-white/5 px-6 py-4 text-[9px] font-black uppercase text-white/30 tracking-widest">
          <div>Content</div>
          <div>Genres</div>
          <div className="text-right">Plays</div>
          <div className="text-right text-orange-400">Clicks</div>
          <div className="text-right text-indigo-400">CTR</div>
        </div>

        <div className="divide-y divide-white/5">
          {viewItems.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[1.5fr_1fr_0.6fr_0.6fr_0.6fr] gap-2 px-6 py-5 text-sm hover:bg-white/[0.03] transition group">
              <div className="truncate">
                <div className="font-bold truncate group-hover:text-indigo-400 transition">
                  <span className="text-[10px] text-white/20 mr-3 font-mono">{i + 1}</span>
                  {r.title || "Untitled"}
                </div>
                <div className="text-[9px] text-white/20 font-mono mt-1 uppercase tracking-tighter">{r.id}</div>
              </div>
              <div className="flex flex-wrap gap-1 items-center overflow-hidden">
                {r.genres?.slice(0, 1).map(g => (
                  <span key={g} className="text-[8px] border border-white/10 px-2 py-0.5 rounded-full text-white/40 font-bold uppercase">{g}</span>
                ))}
              </div>
              <div className="text-right tabular-nums font-medium">{r.play.toLocaleString()}</div>
              <div className="text-right tabular-nums font-bold text-orange-400/80">{r.click.toLocaleString()}</div>
              <div className="text-right tabular-nums font-black text-indigo-400">{pct(r.ctr)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, highlight }: any) {
  return (
    <div className={`rounded-[2rem] border border-white/10 p-6 ${highlight ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-neutral-900'}`}>
      <div className="text-[9px] font-black uppercase text-white/40 tracking-widest">{title}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-black tracking-tighter tabular-nums">{value}</span>
        {unit && <span className="text-xs font-bold text-white/20">{unit}</span>}
      </div>
    </div>
  );
}

function btn(active: boolean) {
  return `rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-tighter transition-all active:scale-95 ${
    active ? "bg-white text-black shadow-lg shadow-white/10" : "bg-white/5 text-white/30 hover:bg-white/10"
  }`;
}