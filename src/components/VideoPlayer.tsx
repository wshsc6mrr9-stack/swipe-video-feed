"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { VideoItem } from "@/lib/types";

type Props = {
  video: VideoItem;
  isActive?: boolean;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function VideoPlayer({ video, isActive = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ✅ リロード直後のタップ要求を消すため、初期は必ずミュート
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const seekDraftRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const src = useMemo(() => String((video as any).url ?? (video as any).src ?? "").trim(), [video]);
  const poster = useMemo(() => String((video as any).poster ?? "").trim() || undefined, [video]);

  const affUrl = useMemo(() => {
    const u = String(((video as any).affUrl ?? (video as any).affiliateUrl ?? "")).trim();
    return u ? u : undefined;
  }, [video]);

  const affLabel = useMemo(() => {
    const t = String(((video as any).affLabel ?? (video as any).affiliateLabel ?? "")).trim();
    return t ? t : undefined;
  }, [video]);

  const title = useMemo(() => String((video as any).title ?? "").trim(), [video]);

  // src変更時リセット
  useEffect(() => {
    setReady(false);
    setError(null);
    setDuration(0);
    setCurrent(0);

    const el = videoRef.current;
    if (!el) return;

    // iOS向け：属性も念のためセット
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
    el.muted = true; // 初期は強制
    (el as any).playsInline = true;

    try {
      el.load();
    } catch {}
  }, [src]);

  // メタ更新
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onCan = () => setReady(true);
    const onErr = () => setError("video error");
    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onTime = () => {
      if (seeking) return;
      setCurrent(el.currentTime || 0);
    };

    el.addEventListener("canplay", onCan);
    el.addEventListener("loadeddata", onCan);
    el.addEventListener("error", onErr);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("durationchange", onMeta);
    el.addEventListener("timeupdate", onTime);

    return () => {
      el.removeEventListener("canplay", onCan);
      el.removeEventListener("loadeddata", onCan);
      el.removeEventListener("error", onErr);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("durationchange", onMeta);
      el.removeEventListener("timeupdate", onTime);
    };
  }, [seeking]);

  // ✅ activeだけ再生（mutedで自動再生）
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");

    if (!isActive) {
      try {
        el.pause();
      } catch {}
      setPlaying(false);
      return;
    }

    // activeになったら、まず muted を反映して複数回キック
    el.muted = muted;
    (el as any).playsInline = true;

    let cancelled = false;

    const kick = async () => {
      const tries = [0, 120, 300, 700];
      for (const d of tries) {
        await new Promise((r) => setTimeout(r, d));
        if (cancelled) return;

        try {
          const p = el.play();
          if (p && typeof (p as any).then === "function") await p;
          if (cancelled) return;
          setPlaying(true);
          return;
        } catch {
          setPlaying(false);
          // 次のトライへ
        }
      }
    };

    kick();

    return () => {
      cancelled = true;
    };
  }, [isActive, muted]);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      el.muted = muted;
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      try {
        el.pause();
      } catch {}
      setPlaying(false);
    }
  }

  function toggleMute() {
    const el = videoRef.current;
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (el) el.muted = nextMuted;

    // ミュート解除はブロックされ得る（iOS仕様）ので、再生維持だけ試す
    if (isActive && el && !nextMuted) {
      el.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function jump(deltaSec: number) {
    const el = videoRef.current;
    if (!el) return;
    const d = Number.isFinite(el.duration) ? el.duration : duration;
    const next = clamp((el.currentTime || 0) + deltaSec, 0, Math.max(0, d || 0));
    el.currentTime = next;
    setCurrent(next);
  }

  function onSeekCommit(nextTime: number) {
    const el = videoRef.current;
    if (!el) return;
    const d = Number.isFinite(el.duration) ? el.duration : duration;
    el.currentTime = clamp(nextTime, 0, Math.max(0, d || 0));
    setCurrent(el.currentTime || 0);
  }

  const seekValue = seeking ? seekDraftRef.current : current;
  const seekMax = Math.max(0, duration || 0);

  const onSeekStart = () => {
    setSeeking(true);
    seekDraftRef.current = seekValue || 0;
  };
  const onSeekChange = (v: string) => {
    const next = Number(v);
    if (!Number.isFinite(next)) return;
    seekDraftRef.current = next;
    setCurrent(next);
  };
  const onSeekEnd = () => {
    setSeeking(false);
    onSeekCommit(seekDraftRef.current);
  };

  return (
    <div className="relative h-[100svh] w-full bg-black overflow-hidden select-none">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain bg-black"
        src={src || undefined}
        poster={poster}
        playsInline
        muted={muted}
        autoPlay
        preload="auto"
        controls={false}
      />

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm pointer-events-none">
          Loading...
        </div>
      )}

      {error && (
        <div className="absolute left-3 top-3 z-50 rounded-lg bg-black/60 px-3 py-2 text-xs text-red-200 pointer-events-none">
          {error}
        </div>
      )}

      {affUrl && (
        <a
          href={affUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute right-3 bottom-24 z-40 rounded-full bg-white text-black px-4 py-2 text-sm font-semibold pointer-events-auto"
        >
          {affLabel ?? "商品を見る"}
        </a>
      )}

      <div className="absolute left-3 right-3 bottom-4 z-40 pointer-events-auto">
        <div className="mb-2">
          <div className="inline-flex items-center gap-2">
            <button className="rounded-lg bg-white/10 text-white px-3 py-2 text-sm" onClick={() => jump(-10)}>-10</button>
            <button className="rounded-lg bg-white/10 text-white px-3 py-2 text-sm" onClick={() => jump(-5)}>-5</button>
            <button className="rounded-lg bg-white/10 text-white px-3 py-2 text-sm" onClick={() => jump(+5)}>+5</button>
            <button className="rounded-lg bg-white/10 text-white px-3 py-2 text-sm" onClick={() => jump(+10)}>+10</button>
          </div>
        </div>

        <div className="mb-2 text-white/90 text-sm font-medium line-clamp-1">
          {title || " "}
        </div>

        <div className="mb-3">
          <input
            className="w-full"
            type="range"
            min={0}
            max={seekMax || 0}
            step={0.01}
            value={seekMax > 0 ? clamp(seekValue, 0, seekMax) : 0}
            onPointerDown={onSeekStart}
            onPointerUp={onSeekEnd}
            onPointerCancel={onSeekEnd}
            onMouseDown={onSeekStart}
            onMouseUp={onSeekEnd}
            onTouchStart={onSeekStart}
            onTouchEnd={onSeekEnd}
            onChange={(e) => onSeekChange(e.target.value)}
            disabled={seekMax <= 0}
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold" onClick={togglePlay}>
            {playing ? "停止" : "再生"}
          </button>

          <button className="rounded-xl bg-white/10 text-white px-4 py-2 text-sm font-semibold" onClick={toggleMute}>
            {muted ? "ミュート" : "音ON"}
          </button>
        </div>
      </div>
    </div>
  );
}
