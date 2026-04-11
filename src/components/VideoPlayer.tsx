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
const KEY_MUTED = "audio_muted_v1";
const DOUBLE_TAP_MS = 240; 

function readMutedPreference() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(KEY_MUTED) !== "0";
  } catch {
    return true;
  }
}

export default function VideoPlayer({
  video,
  isActive = false,
  isNeighbor = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const sourceKeyRef = useRef("");

  const startOffsetAppliedRef = useRef(false);
  const neighborPrimedRef = useRef(false);
  const isDraggingRef = useRef(false);
  
  const leftTapAtRef = useRef(0);
  const rightTapAtRef = useRef(0);
  
  const rawSrc = (video.url ?? (video as any).src ?? "") as string;

  const [playing, setPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => readMutedPreference());
  const [showTapToUnmute, setShowTapToUnmute] = useState(false);

  const [duration, setDuration] = useState<number>(() => Number(video.duration ?? 0));
  const [current, setCurrent] = useState(START_OFFSET_SEC);
  const [skipToast, setSkipToast] = useState<{ id: number; label: string; } | null>(null);

  useEffect(() => {
    setPlaying(false);
    setShowTapToUnmute(false);
    setIsBuffering(true);
    setShowLoader(false);
    setCurrent(START_OFFSET_SEC);
    setDuration(Number(video.duration ?? 0));
    setSkipToast(null);
    startOffsetAppliedRef.current = false;
    neighborPrimedRef.current = false;
    isDraggingRef.current = false;
    leftTapAtRef.current = 0;
    rightTapAtRef.current = 0;
  }, [video.id, video.duration]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEY_MUTED, muted ? "1" : "0");
    } catch {}
  }, [muted]);

  useEffect(() => {
    let timer: number;
    if (isActive && isBuffering) {
      timer = window.setTimeout(() => setShowLoader(true), 400);
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
      const level = hlsRef.current.levels?.[hlsRef.current.currentLevel >= 0 ? hlsRef.current.currentLevel : 0];
      if (level?.details?.totalduration) next = level.details.totalduration;
    }
    if (next > 0) setDuration((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
  }

  async function seekBy(delta: number) {
    const el = videoRef.current;
    if (!el) return;
    const maxTime = el.duration > 0 ? el.duration : Number.POSITIVE_INFINITY;
    const nextTime = Math.max(0, Math.min(el.currentTime + delta, maxTime));
    try {
      el.currentTime = nextTime;
      setCurrent(nextTime);
      setSkipToast({ id: Date.now(), label: delta > 0 ? `+${Math.abs(delta)}秒` : `-${Math.abs(delta)}秒` });
    } catch {}
  }

  // --- コアロジック ---
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !rawSrc) return;

    const sourceKey = `${video.id}__${rawSrc}`;
    if (sourceKeyRef.current === sourceKey) return;
    sourceKeyRef.current = sourceKey;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const enforceStartOffset = () => {
      if (startOffsetAppliedRef.current) return;
      if (el.currentTime < START_OFFSET_SEC - START_TOLERANCE_SEC) {
        if (el.readyState >= 1) {
          try { el.currentTime = START_OFFSET_SEC; } catch {}
        }
      } else {
        startOffsetAppliedRef.current = true;
      }
    };

    const onLoadedMetadata = () => {
      syncDurationFromElement(el);
      enforceStartOffset();
    };
    const onCanPlay = () => {
      syncDurationFromElement(el);
      enforceStartOffset();
      if (el.readyState >= 3) setIsBuffering(false);
    };
    const onTimeUpdate = () => {
      syncDurationFromElement(el);
      enforceStartOffset();
      if (el.currentTime > START_OFFSET_SEC - 0.5) setIsBuffering(false);
      if (!isDraggingRef.current) setCurrent(el.currentTime);
    };
    const onPlaying = () => {
      setPlaying(true);
      setIsBuffering(false);
      enforceStartOffset();
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setIsBuffering(true);

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("waiting", onWaiting);

    if (rawSrc.includes(".m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          startPosition: START_OFFSET_SEC, 
          maxBufferLength: isActive ? 10 : 4,
          maxMaxBufferLength: isActive ? 20 : 8,
          capLevelToPlayerSize: true, 
          startFragPrefetch: true,    
          enableWorker: true,
          lowLatencyMode: true,
        } as any);

        hlsRef.current = hls;
        hls.loadSource(rawSrc);
        hls.attachMedia(el);
        hls.on(Hls.Events.MANIFEST_PARSED, enforceStartOffset);
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
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("waiting", onWaiting);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [video.id, rawSrc, isActive, isNeighbor]);

  // --- アクティブ制御 ---
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      el.muted = muted;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setPlaying(true);
          setShowTapToUnmute(muted);
          setIsBuffering(false);
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
        el.muted = true;
        try { el.currentTime = START_OFFSET_SEC; } catch {}
        const p = el.play();
        if (p !== undefined) {
          p.then(() => {
            el.pause();
            neighborPrimedRef.current = true;
          }).catch(() => {});
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

  // --- タップイベント群 ---
  const togglePlay = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    
    if (el.paused) {
      el.muted = muted;
      setPlaying(true); 
      el.play().catch(() => setPlaying(false));
    } else {
      setPlaying(false);
      el.pause();
    }
  };

  const handleTapToUnmute = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    setMuted(false);
    setShowTapToUnmute(false);
    el.muted = false;
    setPlaying(true);
    el.play().catch(() => setPlaying(false));
  };

  const handleLeftTap = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - leftTapAtRef.current <= DOUBLE_TAP_MS) {
      leftTapAtRef.current = 0;
      void seekBy(-6);
      return;
    }
    leftTapAtRef.current = now;
  };

  const handleRightTap = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - rightTapAtRef.current <= DOUBLE_TAP_MS) {
      rightTapAtRef.current = 0;
      void seekBy(6);
      return;
    }
    rightTapAtRef.current = now;
  };

  const posterUrl = video.thumbnailUrl || video.posterUrl || "";

  const displayDuration = duration > 0 ? duration : Number(video.duration ?? 0);
  const hasDuration = Number.isFinite(displayDuration) && displayDuration > 0;
  const sliderMin = 0;
  const sliderMax = hasDuration ? displayDuration : Math.max(100, current); 
  const sliderValue = Math.min(Math.max(current, sliderMin), sliderMax);
  const progressPercentage = sliderMax > 0 ? (sliderValue / sliderMax) * 100 : 0;

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-icon {
          0% { transform: scale(0.95); opacity: 0.8; }
          100% { transform: scale(1.05); opacity: 1; }
        }
        
        .tiktok-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 24px; 
          background: transparent;
          outline: none;
          margin: 0;
          padding: 0;
          display: block;
          touch-action: none; 
        }
        .tiktok-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 24px;
          background: transparent;
          border: none;
        }
        .tiktok-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          margin-top: 4px; 
          opacity: 0; 
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
          transition: opacity 0.2s ease;
        }
        .tiktok-slider:active::-webkit-slider-thumb,
        .tiktok-slider:hover::-webkit-slider-thumb {
          opacity: 1; 
        }
      `}</style>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          preload={isActive || isNeighbor ? "auto" : "none"}
          muted={!isActive || muted}
          poster={posterUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: isActive ? 1 : 0.001,
            transition: "none", 
            backgroundColor: "transparent",
          }}
        />

        {/* 読み込みスピナー */}
        {showLoader && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              pointerEvents: "none",
              animation: "fade-in 0.3s ease-out",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="rgba(255,255,255,0.85)">
              <g fill="none" fillRule="evenodd">
                <g transform="translate(1 1)" strokeWidth="3">
                  <circle strokeOpacity=".2" cx="18" cy="18" r="18"/>
                  <path d="M36 18c0-9.94-8.06-18-18-18">
                    <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.8s" repeatCount="indefinite"/>
                  </path>
                </g>
              </g>
            </svg>
          </div>
        )}

        {/* 一時停止時の視覚的フィードバック（暗転＋巨大な再生アイコン） */}
        {isActive && !playing && !showLoader && !showTapToUnmute && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20, 
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.4)", 
              pointerEvents: "none", 
              animation: "fade-in 0.15s ease-out",
            }}
          >
            <svg 
              width="80" 
              height="80" 
              viewBox="0 0 24 24" 
              fill="rgba(255,255,255,0.9)" 
              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))", marginLeft: "6px" }}
            >
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z" />
            </svg>
          </div>
        )}

        {/* ⚠️修正: 左右のタップ領域をそれぞれ40%に拡大、中央の再生/停止領域は残り20% */}
        {isActive && (
          <>
            <div onClick={handleLeftTap} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "40%", zIndex: 11, background: "transparent", cursor: "pointer" }} />
            <div onClick={handleRightTap} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "40%", zIndex: 11, background: "transparent", cursor: "pointer" }} />
            <div onClick={togglePlay} style={{ position: "absolute", left: "40%", right: "40%", top: 0, bottom: 0, zIndex: 11, background: "transparent", cursor: "pointer" }} />
          </>
        )}

        {/* スキップ時のトースト通知 */}
        {isActive && skipToast && (
          <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 84px)", left: "50%", transform: "translateX(-50%)", zIndex: 26, pointerEvents: "none" }}>
            <div style={{ minWidth: 100, height: 40, padding: "0 20px", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontWeight: 800, fontSize: 16, backdropFilter: "blur(10px)", animation: "fade-in 0.1s ease-out" }}>
              {skipToast.label}
            </div>
          </div>
        )}

        {/* 画面下部のUI */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
              pointerEvents: "none",
            }}
          >
            <div 
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "140px",
                background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)",
                zIndex: -1,
              }}
            />

            <div style={{ padding: "0 16px 12px 16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px", pointerEvents: "auto" }}>
              {video.affUrl && (
                <a
                  href={video.affUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: "bold",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  ▶︎ 本編を見る
                </a>
              )}

              <div
                style={{
                  color: "#fff",
                  fontSize: "15px",
                  lineHeight: 1.4,
                  fontWeight: 500,
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {video.title || "Untitled"}
              </div>
            </div>

            <div 
              style={{ width: "100%", padding: "0", pointerEvents: "auto", position: "relative" }}
              onPointerDown={(e) => e.stopPropagation()} 
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()} 
              onPointerMove={(e) => e.stopPropagation()}
            >
              <div style={{
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
                height: "3px",
                transform: "translateY(-50%)",
                background: `linear-gradient(to right, #fff ${progressPercentage}%, rgba(255,255,255,0.25) ${progressPercentage}%)`,
                pointerEvents: "none",
                borderRadius: "2px"
              }} />
              
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={0.01}
                value={sliderValue}
                onPointerDown={() => { isDraggingRef.current = true; }}
                onPointerUp={(e) => {
                  isDraggingRef.current = false;
                  if (videoRef.current) videoRef.current.currentTime = Number(e.currentTarget.value);
                }}
                onTouchStart={() => { isDraggingRef.current = true; }}
                onTouchEnd={(e) => {
                  isDraggingRef.current = false;
                  if (videoRef.current) videoRef.current.currentTime = Number(e.currentTarget.value);
                }}
                onChange={(e) => {
                  setCurrent(Number(e.target.value));
                }}
                className="tiktok-slider"
                style={{ position: "relative", zIndex: 2 }}
              />
            </div>
          </div>
        )}

        {/* 自動再生ブロック時の「タップで音ON」ボタン */}
        {isActive && showTapToUnmute && (
          <button
            onClick={handleTapToUnmute}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 25,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                padding: "18px 34px",
                borderRadius: 999,
                background: "rgba(80,50,30,0.45)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#fff",
                fontWeight: 900,
                fontSize: 24,
                letterSpacing: "0.02em",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.28)",
              }}
            >
              タップで音ON
            </div>
          </button>
        )}
      </div>
    </>
  );
}