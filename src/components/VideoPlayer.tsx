"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { VideoMeta } from "@/lib/types";

type Props = {
  video: VideoMeta & { title?: string; thumbnailUrl?: string; posterUrl?: string; affUrl?: string; duration?: number };
  isActive?: boolean;
  isNeighbor?: boolean;
};

const START_OFFSET_SEC = 7;
const START_TOLERANCE_SEC = 0.5;
const KEY_MUTED  = "audio_muted_v1";
const KEY_LIKED  = "liked_videos_v1";
const EVT_LIKES  = "likes_changed_v1";
const DOUBLE_TAP_MS = 240;

function readMutedPreference() {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(KEY_MUTED) !== "0"; } catch { return true; }
}
function readLikedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY_LIKED);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch { return new Set(); }
}
function writeLikedSet(set: Set<string>) {
  try { localStorage.setItem(KEY_LIKED, JSON.stringify(Array.from(set))); } catch {}
}
function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function VideoPlayer({ video, isActive = false, isNeighbor = false }: Props) {
  const videoRef        = useRef<HTMLVideoElement | null>(null);
  const hlsRef          = useRef<Hls | null>(null);
  const sourceKeyRef    = useRef("");
  const startOffsetAppliedRef = useRef(false);
  const neighborPrimedRef     = useRef(false);
  const isDraggingRef         = useRef(false);
  const seekRetryRef          = useRef<number | null>(null);
  const seekDebounceRef       = useRef<number | null>(null);
  const seekPendingRef        = useRef<number | null>(null);
  const intentionalPauseRef   = useRef(false);  // ユーザーが意図的にポーズしたか
  const isActiveRef           = useRef(isActive);
  const mutedRef              = useRef<boolean>(true);
  const leftTapAtRef          = useRef(0);
  const rightTapAtRef         = useRef(0);

  const rawSrc = (video.url ?? (video as any).src ?? "") as string;

  const [playing,         setPlaying]         = useState(false);
  const [isBuffering,     setIsBuffering]      = useState(true);
  const [showLoader,      setShowLoader]       = useState(false);
  const [muted,           setMuted]            = useState<boolean>(() => readMutedPreference());
  const [showTapToUnmute, setShowTapToUnmute]  = useState(false);
  const [duration,        setDuration]         = useState<number>(() => Number(video.duration ?? 0));
  const [current,         setCurrent]          = useState(0);
  const [skipToast,       setSkipToast]        = useState<{ id: number; label: string } | null>(null);
  const [liked,           setLiked]            = useState<boolean>(() => readLikedSet().has(String(video.id)));
  const [likeCount,       setLikeCount]        = useState<number>(() => Number(video.likeCount ?? 0));

  // refを常に最新の値に同期
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { mutedRef.current    = muted;    }, [muted]);

  useEffect(() => {
    setLiked(readLikedSet().has(String(video.id)));
    setLikeCount(Number(video.likeCount ?? 0));
  }, [video.id, video.likeCount]);

  useEffect(() => {
    setPlaying(false);
    setShowTapToUnmute(false);
    setIsBuffering(true);
    setShowLoader(false);
    setCurrent(0);
    setDuration(Number(video.duration ?? 0));
    setSkipToast(null);
    startOffsetAppliedRef.current   = false;
    neighborPrimedRef.current       = false;
    isDraggingRef.current           = false;
    intentionalPauseRef.current     = false;
    leftTapAtRef.current            = 0;
    rightTapAtRef.current           = 0;
    if (seekRetryRef.current)    { window.clearTimeout(seekRetryRef.current);    seekRetryRef.current    = null; }
    if (seekDebounceRef.current) { window.clearTimeout(seekDebounceRef.current); seekDebounceRef.current = null; }
    seekPendingRef.current = null;
  }, [video.id, video.duration]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(KEY_MUTED, muted ? "1" : "0"); } catch {}
  }, [muted]);

  // スピナー：1.2秒経っても再生開始しない場合だけ表示
  useEffect(() => {
    let timer: number;
    if (isActive && isBuffering) {
      timer = window.setTimeout(() => setShowLoader(true), 1200);
    } else {
      setShowLoader(false);
    }
    return () => window.clearTimeout(timer);
  }, [isActive, isBuffering]);

  useEffect(() => {
    if (!skipToast) return;
    const t = window.setTimeout(() => setSkipToast(null), 650);
    return () => window.clearTimeout(t);
  }, [skipToast]);

  function syncDurationFromElement(el: HTMLVideoElement) {
    let next = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    if (next === 0 && hlsRef.current) {
      const lvl = hlsRef.current.levels?.[Math.max(0, hlsRef.current.currentLevel)];
      if (lvl?.details?.totalduration) next = lvl.details.totalduration;
    }
    if (next > 0) setDuration(prev => Math.abs(prev - next) > 0.01 ? next : prev);
  }

  function seekBy(delta: number) {
    const el = videoRef.current;
    if (!el) return;
    const maxTime = el.duration > 0 ? el.duration : Infinity;

    // 連続タップは累積してまとめて1回だけシーク（再バッファ防止）
    const base    = seekPendingRef.current ?? el.currentTime;
    const target  = Math.max(0, Math.min(base + delta, maxTime));
    seekPendingRef.current = target;

    // UIは即時更新
    setCurrent(target);
    setSkipToast({ id: Date.now(), label: delta > 0 ? `+${Math.abs(delta)}秒` : `-${Math.abs(delta)}秒` });

    // 実際のシークは200ms後にまとめて1回
    if (seekDebounceRef.current) window.clearTimeout(seekDebounceRef.current);
    seekDebounceRef.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && seekPendingRef.current !== null) {
        try { v.currentTime = seekPendingRef.current; } catch {}
        seekPendingRef.current = null;
      }
      seekDebounceRef.current = null;
    }, 200);
  }

  // ---- 7秒シーク（バッファが準備できてからリトライ） ----
  const enforceStartOffset = (el: HTMLVideoElement) => {
    if (startOffsetAppliedRef.current) return;
    if (seekRetryRef.current) { window.clearTimeout(seekRetryRef.current); seekRetryRef.current = null; }

    if (el.currentTime >= START_OFFSET_SEC - START_TOLERANCE_SEC) {
      startOffsetAppliedRef.current = true;
      return;
    }
    if (el.readyState >= 2) {
      try { el.currentTime = START_OFFSET_SEC; } catch {}
    } else {
      seekRetryRef.current = window.setTimeout(() => {
        const v = videoRef.current;
        if (v) enforceStartOffset(v);
      }, 150);
    }
  };

  // --- コアロジック ---
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !rawSrc) return;

    const sourceKey = `${video.id}__${rawSrc}`;
    if (sourceKeyRef.current === sourceKey) return;
    sourceKeyRef.current = sourceKey;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const onLoadedMetadata = () => { syncDurationFromElement(el); enforceStartOffset(el); };
    const onCanPlay        = () => { syncDurationFromElement(el); enforceStartOffset(el); if (el.readyState >= 3) setIsBuffering(false); };
    const onTimeUpdate     = () => {
      syncDurationFromElement(el);
      enforceStartOffset(el);
      if (el.currentTime >= START_OFFSET_SEC - START_TOLERANCE_SEC) setIsBuffering(false);
      if (!isDraggingRef.current) setCurrent(el.currentTime);
    };
    const onPlaying = () => { setPlaying(true); setIsBuffering(false); enforceStartOffset(el); };
    const onPause   = () => {
      setPlaying(false);
      // 意図しないポーズ（音声セッション割り込みなど）は自動復帰
      if (isActiveRef.current && !intentionalPauseRef.current) {
        window.setTimeout(() => {
          const v = videoRef.current;
          if (v && v.paused && isActiveRef.current && !intentionalPauseRef.current) {
            v.muted = mutedRef.current;
            v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
          }
        }, 400);
      }
    };
    const onWaiting = () => setIsBuffering(true);
    const onStalled = () => {
      // バッファストール時もアクティブなら復帰を試みる
      if (isActiveRef.current) {
        window.setTimeout(() => {
          const v = videoRef.current;
          if (v && v.paused && isActiveRef.current) {
            v.play().catch(() => {});
          }
        }, 800);
      }
    };

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("canplay",        onCanPlay);
    el.addEventListener("playing",        onPlaying);
    el.addEventListener("pause",          onPause);
    el.addEventListener("timeupdate",     onTimeUpdate);
    el.addEventListener("waiting",        onWaiting);
    el.addEventListener("stalled",        onStalled);

    if (rawSrc.includes(".m3u8")) {
      if (Hls.isSupported()) {
        /**
         * ★ ポイント：
         *   isActive → 7秒から直接バッファ（即再生）
         *   neighbor → 0秒からバッファ開始（20秒分）
         *     → アクティブ化時に7秒は既にバッファ済み → シークが即時
         */
        const hls = new Hls({
          startPosition:    isActive ? START_OFFSET_SEC : 0,
          maxBufferLength:  20,   // neighbor も余裕をもってバッファ
          maxMaxBufferLength: 40,
          capLevelToPlayerSize: true,
          startFragPrefetch:    true,
          enableWorker:         true,
          lowLatencyMode:       false, // low-latency は VOD では逆効果
        } as any);
        hlsRef.current = hls;
        hls.loadSource(rawSrc);
        hls.attachMedia(el);
        hls.on(Hls.Events.MANIFEST_PARSED, () => enforceStartOffset(el));
      } else {
        el.src = rawSrc;
        el.preload = isActive || isNeighbor ? "auto" : "none";
      }
    } else {
      el.src = rawSrc;
      el.preload = isActive || isNeighbor ? "auto" : "none";
    }

    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("canplay",        onCanPlay);
      el.removeEventListener("playing",        onPlaying);
      el.removeEventListener("pause",          onPause);
      el.removeEventListener("timeupdate",     onTimeUpdate);
      el.removeEventListener("stalled",        onStalled);
      el.removeEventListener("waiting",        onWaiting);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (seekRetryRef.current) { window.clearTimeout(seekRetryRef.current); seekRetryRef.current = null; }
    };
  }, [video.id, rawSrc, isActive, isNeighbor]);

  // --- アクティブ制御 ---
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      if (!startOffsetAppliedRef.current && el.readyState >= 2) {
        try { el.currentTime = START_OFFSET_SEC; } catch {}
      }
      el.muted = muted;
      const p = el.play();
      if (p !== undefined) {
        p.then(() => {
          setPlaying(true);
          setShowTapToUnmute(muted);
          setIsBuffering(false);
          enforceStartOffset(el);
        }).catch(() => {
          el.muted = true;
          setMuted(true);
          setShowTapToUnmute(true);
          setPlaying(false);
          el.play().catch(() => {});
        });
      }
    } else if (isNeighbor) {
      if (!neighborPrimedRef.current) {
        el.preload = "auto";
        el.muted   = true;
        const p = el.play();
        if (p !== undefined) {
          p.then(() => { el.pause(); neighborPrimedRef.current = true; }).catch(() => {});
        }
      }
      setShowTapToUnmute(false);
      setPlaying(false);
    } else {
      el.pause();
      setPlaying(false);
      setShowTapToUnmute(false);
    }
  }, [isActive, isNeighbor, muted]);

  // --- バックグラウンド復帰時の自動再生再開 ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!isActiveRef.current) return;
      const el = videoRef.current;
      if (!el || !el.paused) return;
      if (intentionalPauseRef.current) return; // ユーザーがポーズ中なら再開しない
      el.muted = mutedRef.current;
      el.play().catch(() => { el.muted = true; el.play().catch(() => {}); });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // --- ハートボタン ---
  const handleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const id       = String(video.id);
    const set      = readLikedSet();
    const nextLiked = !set.has(id);
    if (nextLiked) { set.add(id); } else { set.delete(id); }
    writeLikedSet(set);
    setLiked(nextLiked);
    // 楽観的にカウント更新
    setLikeCount(prev => Math.max(0, prev + (nextLiked ? 1 : -1)));
    try {
      window.dispatchEvent(new CustomEvent(EVT_LIKES, { detail: { videoId: id, count: 0 } }));
    } catch {}
    // サーバー更新 & 実カウント反映
    fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: id, delta: nextLiked ? 1 : -1 }),
    })
      .then(r => r.json())
      .then(data => { if (typeof data.count === "number") setLikeCount(data.count); })
      .catch(() => {});
  };

  // --- タップ ---
  const togglePlay = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      intentionalPauseRef.current = false; // 再開なので意図的ポーズ解除
      el.muted = muted;
      setPlaying(true);
      el.play().catch(() => setPlaying(false));
    } else {
      intentionalPauseRef.current = true;  // ユーザーが意図的にポーズ
      setPlaying(false);
      el.pause();
    }
  };
  const handleTapToUnmute = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    setMuted(false); setShowTapToUnmute(false); el.muted = false;
    setPlaying(true); el.play().catch(() => setPlaying(false));
  };
  const handleLeftTap = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - leftTapAtRef.current <= DOUBLE_TAP_MS) { leftTapAtRef.current = 0; void seekBy(-6); return; }
    leftTapAtRef.current = now;
  };
  const handleRightTap = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - rightTapAtRef.current <= DOUBLE_TAP_MS) { rightTapAtRef.current = 0; void seekBy(6); return; }
    rightTapAtRef.current = now;
  };

  const posterUrl = video.thumbnailUrl || video.posterUrl || "";
  const displayDuration   = duration > 0 ? duration : Number(video.duration ?? 0);
  const hasDuration       = Number.isFinite(displayDuration) && displayDuration > 0;
  const sliderMin         = 0;
  const sliderMax         = hasDuration ? displayDuration : Math.max(100, current);
  const sliderValue       = Math.min(Math.max(current, sliderMin), sliderMax);
  const progressPct       = sliderMax > 0 ? (sliderValue / sliderMax) * 100 : 0;

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes heart-pop {
          0%   { transform: scale(1);    }
          40%  { transform: scale(1.4);  }
          70%  { transform: scale(0.88); }
          100% { transform: scale(1);    }
        }
        .aff-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 999px;
          border: 1.5px solid rgba(255,60,60,0.85);
          cursor: pointer; text-decoration: none;
          font-size: 13px; font-weight: 700; letter-spacing: 0.03em; color: #fff;
          background: rgba(0,0,0,0.25);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 0 10px rgba(255,60,60,0.25);
          transition: background .15s, box-shadow .15s, transform .12s;
          -webkit-tap-highlight-color: transparent;
        }
        .aff-btn:active { transform: scale(0.95); background: rgba(255,60,60,0.15); }
        .like-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 5px; padding: 0 12px; height: 36px; border-radius: 999px;
          border: 1.5px solid rgba(255,255,255,0.4);
          background: rgba(0,0,0,0.25);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          cursor: pointer; color: rgba(255,255,255,0.9);
          font-size: 12px; font-weight: 700;
          transition: border-color .15s, background .15s, transform .12s;
          -webkit-tap-highlight-color: transparent;
        }
        .like-btn.liked {
          border-color: rgba(255,60,60,0.9);
          background: rgba(255,60,60,0.12);
          color: #ff5555;
          box-shadow: 0 0 10px rgba(255,60,60,0.3);
        }
        .like-btn:active { transform: scale(0.9); }
        .like-btn.liked .heart-icon { animation: heart-pop 0.3s ease; }
        .tiktok-slider {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 24px;
          background: transparent; outline: none;
          margin: 0; padding: 0; display: block; touch-action: none;
        }
        .tiktok-slider::-webkit-slider-runnable-track {
          width: 100%; height: 24px; background: transparent; border: none;
        }
        .tiktok-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: #fff; cursor: pointer; margin-top: 5px;
          opacity: 0; box-shadow: 0 0 4px rgba(0,0,0,.5);
          transition: opacity .2s;
        }
        .tiktok-slider:active::-webkit-slider-thumb,
        .tiktok-slider:hover::-webkit-slider-thumb { opacity: 1; }
      `}</style>

      <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#000", overflow: "hidden" }}>

        {/* ポスター（バッファ中に即表示） */}
        {posterUrl && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            backgroundImage: `url(${posterUrl})`,
            backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat",
            backgroundColor: "#000",
            opacity: isActive && isBuffering ? 1 : 0,
            transition: "opacity 0.25s ease",
          }} />
        )}

        <video
          ref={videoRef} playsInline
          preload={isActive || isNeighbor ? "auto" : "none"}
          muted={!isActive || muted}
          poster={posterUrl}
          style={{
            width: "100%", height: "100%", objectFit: "contain",
            position: "absolute", inset: 0, zIndex: 1,
            opacity: isActive ? 1 : 0.001, transition: "none", backgroundColor: "transparent",
          }}
        />

        {/* 中央スピナー（1.2秒以上かかる時だけ） */}
        {isActive && showLoader && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 15,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", animation: "fade-in 0.2s ease",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.15)",
              borderTopColor: "rgba(255,255,255,0.85)",
              animation: "spin 0.75s linear infinite",
            }} />
          </div>
        )}

        {/* 一時停止フィードバック */}
        {isActive && !playing && !isBuffering && !showTapToUnmute && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.38)", pointerEvents: "none", animation: "fade-in 0.15s ease-out" }}>
            <svg width="76" height="76" viewBox="0 0 24 24" fill="rgba(255,255,255,0.92)" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))", marginLeft: "6px" }}>
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z"/>
            </svg>
          </div>
        )}

        {/* タップ領域 */}
        {isActive && (
          <>
            <div onClick={handleLeftTap}  style={{ position: "absolute", left: 0,     top: 0, bottom: 0, width: "40%",          zIndex: 11, background: "transparent", cursor: "pointer" }} />
            <div onClick={handleRightTap} style={{ position: "absolute", right: 0,    top: 0, bottom: 0, width: "40%",          zIndex: 11, background: "transparent", cursor: "pointer" }} />
            <div onClick={togglePlay}     style={{ position: "absolute", left: "40%", top: 0, bottom: 0, right: "40%",          zIndex: 11, background: "transparent", cursor: "pointer" }} />
          </>
        )}

        {/* スキップトースト */}
        {isActive && skipToast && (
          <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 84px)", left: "50%", transform: "translateX(-50%)", zIndex: 26, pointerEvents: "none" }}>
            <div style={{ minWidth: 100, height: 40, padding: "0 20px", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontWeight: 800, fontSize: 16, backdropFilter: "blur(10px)", animation: "fade-in 0.1s ease-out" }}>
              {skipToast.label}
            </div>
          </div>
        )}

        {/* 下部 UI */}
        {isActive && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 30, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)", pointerEvents: "none" }}>
            {/* グラデーション */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "180px", background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)", zIndex: -1 }} />

            {/* ボタン行 + タイトル */}
            <div style={{ padding: "0 16px 12px 16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px", pointerEvents: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {video.affUrl && (
                  <a href={video.affUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="aff-btn">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z"/>
                    </svg>
                    本編を見る
                  </a>
                )}

                {/* ハート + カウント */}
                <button onClick={handleLike} className={`like-btn${liked ? " liked" : ""}`} aria-label={liked ? "いいね解除" : "いいね"}>
                  <svg className="heart-icon" width="16" height="16" viewBox="0 0 24 24"
                    fill={liked ? "currentColor" : "none"}
                    stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {likeCount > 0 && (
                    <span>{formatCount(likeCount)}</span>
                  )}
                </button>
              </div>

              <div style={{ color: "#fff", fontSize: "14px", lineHeight: 1.45, fontWeight: 500, textShadow: "0 1px 4px rgba(0,0,0,0.9)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {video.title || ""}
              </div>
            </div>

            {/* シークバー */}
            <div
              style={{ width: "100%", paddingLeft: "calc(env(safe-area-inset-left) + 4px)", paddingRight: "calc(env(safe-area-inset-right) + 4px)", pointerEvents: "auto", position: "relative", boxSizing: "border-box" }}
              onPointerDown={e => e.stopPropagation()}
              onTouchStart={e  => e.stopPropagation()}
              onTouchMove={e   => e.stopPropagation()}
              onPointerMove={e => e.stopPropagation()}
            >
              <div style={{ position: "absolute", top: "50%", left: "calc(env(safe-area-inset-left) + 4px)", right: "calc(env(safe-area-inset-right) + 4px)", height: "2px", transform: "translateY(-50%)", background: `linear-gradient(to right, rgba(255,255,255,0.95) ${progressPct}%, rgba(255,255,255,0.22) ${progressPct}%)`, pointerEvents: "none", borderRadius: "2px" }} />
              <input
                type="range" min={sliderMin} max={sliderMax} step={0.01} value={sliderValue}
                onPointerDown={() => { isDraggingRef.current = true; }}
                onPointerUp={e  => { isDraggingRef.current = false; if (videoRef.current) videoRef.current.currentTime = Number(e.currentTarget.value); }}
                onTouchStart={() => { isDraggingRef.current = true; }}
                onTouchEnd={e   => { isDraggingRef.current = false; if (videoRef.current) videoRef.current.currentTime = Number(e.currentTarget.value); }}
                onChange={e => setCurrent(Number(e.target.value))}
                className="tiktok-slider" style={{ position: "relative", zIndex: 2 }}
              />
            </div>
          </div>
        )}

        {/* タップで音ON */}
        {isActive && showTapToUnmute && (
          <button onClick={handleTapToUnmute} style={{ position: "absolute", inset: 0, zIndex: 25, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
            <div style={{ padding: "18px 34px", borderRadius: 999, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontWeight: 900, fontSize: 22, backdropFilter: "blur(12px)", boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}>
              タップで音ON
            </div>
          </button>
        )}
      </div>
    </>
  );
}
