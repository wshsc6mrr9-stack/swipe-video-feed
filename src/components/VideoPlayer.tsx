"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import type { VideoMeta } from "@/lib/types";

type Props = {
  video: VideoMeta;
  isActive?: boolean;
};

const KEY_MUTED = "audio_muted_v1";
const EVT_MUTED = "audio_muted_changed_v1";

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

function readMuted(): boolean {
  try {
    const v = localStorage.getItem(KEY_MUTED);
    if (v === "0") return false; // 0 = unmuted
    if (v === "1") return true;  // 1 = muted
  } catch {}
  return true; // デフォはミュート
}

function writeMuted(muted: boolean) {
  try {
    localStorage.setItem(KEY_MUTED, muted ? "1" : "0");
  } catch {}
  try {
    window.dispatchEvent(new Event(EVT_MUTED));
  } catch {}
}

export default function VideoPlayer({ video, isActive = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const src = (video.url ?? (video as any).src ?? "") as string;

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  // 保存されてるミュート状態（全動画で共有する“設定”）
  const [muted, setMuted] = useState<boolean>(() => readMuted());

  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const affUrl =
    (video.affiliateUrl ?? (video as any).affUrl) as string | undefined;
  const affLabel =
    ((video.affiliateLabel ?? (video as any).affLabel) as
      | string
      | undefined) || "商品を見る";

  // ✅ 実際に適用するミュートは「アクティブだけ保存状態を使う」
  //    非アクティブは常に true（強制ミュート）にして二重音を防ぐ
  const effectiveMuted = isActive ? muted : true;

  // ✅ 他のVideoPlayerとも同期（設定は同期するが、非アクティブは強制ミュートで鳴らさない）
  useEffect(() => {
    const on = () => setMuted(readMuted());
    window.addEventListener(EVT_MUTED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVT_MUTED, on);
      window.removeEventListener("storage", on);
    };
  }, []);

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
        el.src = src; // Safari native HLS
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

  // ✅ active だけ再生、inactive は確実に停止
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // ミュート適用（inactive は常にミュート）
    el.muted = effectiveMuted;

    if (!isActive) {
      // 🔥 ここが重要：裏で鳴らないように“確実に止める”
      try {
        el.pause();
      } catch {}
      setPlaying(false);

      // 任意：戻った時に音ズレや残音っぽさが出る場合の保険
      try {
        el.currentTime = 0;
      } catch {}

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
  }, [isActive, effectiveMuted]);

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

    // ✅ 保存＆同期（設定）
    writeMuted(next);

    // ✅ ただし実際の適用は active の時だけ（effectiveMuted）
    el.muted = isActive ? next : true;
  };

  const seekTo = (t: number) => {
    const el = videoRef.current;
    if (!el) return;
    const d = Number.isFinite(el.duration) ? el.duration : duration || 0;
    el.currentTime = clamp(t, 0, d || 0);
  };

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
      <video
        ref={videoRef}
        playsInline
        muted={effectiveMuted}
        preload="auto"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "black",
          position: "absolute",
          inset: 0,
          zIndex: 0,
        }}
        onClick={togglePlay}
      />

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
          background:
            "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))",
          zIndex: 20,
          pointerEvents: "auto",
        }}
        onPointerDown={stop}
        onClick={stop}
      >
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
