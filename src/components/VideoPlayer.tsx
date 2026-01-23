"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import type { VideoMeta } from "@/lib/types";

type Props = {
  video: VideoMeta;
  isActive?: boolean;
};

function isHlsUrl(url?: string) {
  return !!url && url.includes(".m3u8");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatTime(t: number) {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoPlayer({ video, isActive = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const src = (video.url ?? (video as any).src ?? "") as string;

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const affUrl = (video as any).affUrl as string | undefined;
  const affLabel = ((video as any).affLabel as string | undefined) || "商品を見る";

  // HLS attach
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    setReady(false);

    try {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    } catch {}

    if (isHlsUrl(src)) {
      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(el);
        hls.on(Hls.Events.MANIFEST_PARSED, () => setReady(true));
      } else {
        // Safari native HLS
        el.src = src;
        setReady(true);
      }
    } else {
      el.src = src;
      setReady(true);
    }

    return () => {
      try {
        hlsRef.current?.destroy();
        hlsRef.current = null;
      } catch {}
    };
  }, [src]);

  // active video autoplay
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.muted = muted;

    if (!isActive) {
      el.pause();
      setPlaying(false);
      return;
    }

    const play = async () => {
      try {
        await el.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    };

    play();
  }, [isActive, muted]);

  // events
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onLoaded = () => {
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
      setReady(true);
    };
    const onTime = () => setCurrent(el.currentTime || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  // ✅ クリックが video に吸われてる時があるので、ボタン側で必ず止める
  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    // @ts-ignore
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  const togglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
        setPlaying(true);
      } catch {}
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    const next = !muted;
    setMuted(next);
    el.muted = next;
  };

  const seekTo = (t: number) => {
    const el = videoRef.current;
    if (!el) return;
    const d = Number.isFinite(el.duration) ? el.duration : duration || 0;
    el.currentTime = clamp(t, 0, d || 0);
  };

  // ✅ skip は state(current) じゃなく “今の video.currentTime” を使う（ズレ防止）
  const skip = (sec: number) => {
    const el = videoRef.current;
    if (!el) return;
    const base = Number.isFinite(el.currentTime) ? el.currentTime : current;
    seekTo(base + sec);
  };

  const titleText = useMemo(() => {
    return video.title || src || "";
  }, [video.title, src]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "black",
      }}
    >
      {/* video */}
      <video
        ref={videoRef}
        playsInline
        muted={muted}
        preload="auto"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "black",
          position: "absolute",
          inset: 0,
          zIndex: 0, // ✅ controls より下
        }}
        onClick={togglePlay}
      />

      {/* loading */}
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#fff",
            zIndex: 10,
          }}
        >
          Loading...
        </div>
      )}

      {/* controls */}
      <div
        data-no-swipe="1"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 12,
          display: "grid",
          gap: 10,
          background: "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))",
          zIndex: 20, // ✅ 絶対に上
          pointerEvents: "auto",
        }}
        // ✅ controls 全体でも “親クリック” を止める（Safari保険）
        onPointerDown={stop}
        onClick={stop}
      >
        {/* 上段：スキップ＋アフィ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button data-no-swipe="1" onPointerDown={stop} onClick={(e) => { stop(e); skip(-10); }} style={btnSmall}>-10</button>
            <button data-no-swipe="1" onPointerDown={stop} onClick={(e) => { stop(e); skip(-5); }} style={btnSmall}>-5</button>
            <button data-no-swipe="1" onPointerDown={stop} onClick={(e) => { stop(e); skip(5); }} style={btnSmall}>+5</button>
            <button data-no-swipe="1" onPointerDown={stop} onClick={(e) => { stop(e); skip(10); }} style={btnSmall}>+10</button>
          </div>

          {affUrl ? (
            <a
              data-no-swipe="1"
              onPointerDown={stop}
              onClick={stop}
              href={affUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "#fff",
                color: "#000",
                textDecoration: "none",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {affLabel}
            </a>
          ) : null}
        </div>

        {/* シーク */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#fff", fontSize: 12, minWidth: 42 }}>{formatTime(current)}</span>
          <input
            data-no-swipe="1"
            type="range"
            min={0}
            max={Math.max(0, duration || 0)}
            step={0.01}
            value={Math.min(current, duration || 0)}
            onPointerDown={stop}
            onClick={stop}
            onChange={(e) => seekTo(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <span style={{ color: "#fff", fontSize: 12, minWidth: 42, textAlign: "right" }}>
            {formatTime(duration)}
          </span>
        </div>

        {/* 下段：再生/ミュート + タイトル */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              data-no-swipe="1"
              onPointerDown={stop}
              onClick={(e) => {
                stop(e);
                togglePlay();
              }}
              style={btnBig}
            >
              {playing ? "停止" : "再生"}
            </button>
            <button
              data-no-swipe="1"
              onPointerDown={stop}
              onClick={(e) => {
                stop(e);
                toggleMute();
              }}
              style={btnBig}
            >
              {muted ? "ミュート" : "音ON"}
            </button>
          </div>

          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "right", maxWidth: "58vw" }}>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {titleText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const btnSmall: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  border: "none",
  fontWeight: 700,
};

const btnBig: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  border: "none",
  fontWeight: 800,
  minWidth: 72,
};
