"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

type VideoMeta = {
  id: string;
  title: string;

  url?: string;
  src?: string;
  poster?: string;

  affUrl?: string;
  affLabel?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;
};

type Props = {
  video: VideoMeta;
  isActive?: boolean;
};

function getUrl(video: VideoMeta) {
  return video.url ?? video.src ?? "";
}

function isHls(url: string) {
  return /\.m3u8(\?|#|$)/i.test(url);
}

function formatTime(t: number) {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoPlayer({ video, isActive = false }: Props) {
  const url = useMemo(() => getUrl(video), [video]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);

  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const affUrl = (video as any).affUrl ?? (video as any).affiliateUrl;
  const affLabel = (video as any).affLabel ?? (video as any).affiliateLabel;

  // HLS attach
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    setReady(false);

    // cleanup old
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    // iOS Safari は native HLS が多い
    if (isHls(url) && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setReady(true));
      hls.on(Hls.Events.ERROR, () => {
        // 失敗しても video src fallback
        try {
          el.src = url;
        } catch {}
        setReady(true);
      });
    } else {
      el.src = url;
      setReady(true);
    }

    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, [url]);

  // active切り替え
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      // iPhone対策：playsInline + muted で自動再生通しやすい
      el.muted = muted;
      el.volume = volume;

      const p = el.play();
      if (p && typeof (p as any).catch === "function") {
        (p as any).catch(() => {
          // 自動再生失敗は一旦止める（タップ待ち）
          setPlaying(false);
        });
      }
      setPlaying(true);
    } else {
      try {
        el.pause();
      } catch {}
      setPlaying(false);
      setCurrent(0);
    }
  }, [isActive, muted, volume]);

  // time update
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onLoaded = () => {
      setDuration(el.duration || 0);
    };
    const onTime = () => {
      setCurrent(el.currentTime || 0);
      setDuration(el.duration || 0);
    };
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

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    const next = !muted;
    setMuted(next);
    el.muted = next;
    if (!next) el.volume = volume;
  };

  const seekTo = (t: number) => {
    const el = videoRef.current;
    if (!el) return;
    const d = el.duration || 0;
    const next = Math.max(0, Math.min(d || 0, t));
    el.currentTime = next;
    setCurrent(next);
  };

  const jump = (delta: number) => {
    const el = videoRef.current;
    if (!el) return;
    seekTo((el.currentTime || 0) + delta);
  };

  return (
    <div className="relative h-full w-full bg-black">
      {/* video */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain bg-black"
        playsInline
        // @ts-ignore
        webkit-playsinline="true"
        muted={muted}
        preload="auto"
        onClick={togglePlay}
      />

      {/* タイトル（上） */}
      <div className="absolute top-3 left-3 right-3 z-20 text-white text-sm drop-shadow">
        {video?.title ?? ""}
      </div>

      {/* 下UI */}
      <div className="absolute left-0 right-0 bottom-0 z-30 p-3 pb-5">
        {/* 上段：±秒ボタン + アフィ */}
        <div className="flex items-center gap-2 mb-2">
          <button
            className="rounded-lg bg-white/20 text-white px-3 py-2 text-sm"
            onClick={() => jump(-10)}
          >
            -10
          </button>
          <button
            className="rounded-lg bg-white/20 text-white px-3 py-2 text-sm"
            onClick={() => jump(-5)}
          >
            -5
          </button>
          <button
            className="rounded-lg bg-white/20 text-white px-3 py-2 text-sm"
            onClick={() => jump(5)}
          >
            +5
          </button>
          <button
            className="rounded-lg bg-white/20 text-white px-3 py-2 text-sm"
            onClick={() => jump(10)}
          >
            +10
          </button>

          <div className="flex-1" />

          {typeof affUrl === "string" && affUrl.trim() ? (
            <a
              href={affUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold"
            >
              {typeof affLabel === "string" && affLabel.trim() ? affLabel : "商品を見る"}
            </a>
          ) : null}
        </div>

        {/* シークバー */}
        <div className="flex items-center gap-2 mb-2">
          <div className="text-white/80 text-xs w-12 text-right">
            {formatTime(current)}
          </div>

          <input
            className="flex-1"
            type="range"
            min={0}
            max={Math.max(0, duration || 0)}
            step={0.1}
            value={Math.min(current, duration || 0)}
            onChange={(e) => seekTo(Number(e.target.value))}
          />

          <div className="text-white/80 text-xs w-12">
            {formatTime(duration)}
          </div>
        </div>

        {/* 再生/ミュート + 音量 */}
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl bg-white/90 text-black px-4 py-2 text-sm font-semibold"
            onClick={togglePlay}
          >
            {playing ? "停止" : "再生"}
          </button>

          <button
            className="rounded-xl bg-white/20 text-white px-4 py-2 text-sm"
            onClick={toggleMute}
          >
            {muted ? "ミュート" : "音あり"}
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2 w-48">
            <div className="text-white/70 text-xs">音量</div>
            <input
              className="flex-1"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                const el = videoRef.current;
                if (el) {
                  el.volume = v;
                  if (!muted) el.muted = false;
                }
              }}
            />
          </div>
        </div>

        {/* URL 表示（必要なければ消してOK） */}
        <div className="mt-2 text-white/60 text-[11px] break-all">
          {url}
        </div>
      </div>

      {/* 読み込み状態 */}
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-white/70 text-sm">
          Loading...
        </div>
      ) : null}
    </div>
  );
}
