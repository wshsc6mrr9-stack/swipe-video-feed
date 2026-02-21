"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import type { VideoMeta } from "@/lib/types";

type Props = {
  video: VideoMeta & { likeCount?: number };
  isActive?: boolean;
};

const KEY_MUTED = "audio_muted_v1";
const EVT_MUTED = "audio_muted_changed_v1";

const KEY_LIKED = "liked_videos_v1";
const EVT_LIKES = "likes_changed_v1";

const START_OFFSET_SEC = 7;
const TAP_MOVE_PX = 14;
const TAP_MAX_MS = 350;

function isHlsUrl(url?: string) {
  return !!url && url.includes(".m3u8");
}

function isMp4Url(url?: string) {
  return !!url && /\.mp4(\?|$|#)/i.test(url);
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
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {}
  return true;
}

function writeMuted(muted: boolean) {
  try {
    localStorage.setItem(KEY_MUTED, muted ? "1" : "0");
  } catch {}
  try {
    window.dispatchEvent(new Event(EVT_MUTED));
  } catch {}
}

function readLikedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY_LIKED);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(String));
  } catch {}
  return new Set();
}

function writeLikedSet(set: Set<string>) {
  try {
    localStorage.setItem(KEY_LIKED, JSON.stringify(Array.from(set)));
  } catch {}
}

function track(videoId: string, event: "play" | "aff_click") {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId: String(videoId), event }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function isNotAllowed(err: any) {
  const name = String(err?.name ?? "");
  const msg = String(err?.message ?? "");
  return (
    name === "NotAllowedError" ||
    /notallowed/i.test(name) ||
    /not allowed/i.test(msg)
  );
}

function withMediaFragmentStart(url: string) {
  const u = String(url ?? "");
  if (!u) return u;
  if (!isMp4Url(u)) return u;
  if (u.includes("#t=")) return u;
  if (u.includes("#")) return u;
  return `${u}#t=${START_OFFSET_SEC}`;
}

export default function VideoPlayer({ video, isActive = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const rawSrc = (video.url ?? (video as any).src ?? "") as string;
  const src = useMemo(() => withMediaFragmentStart(rawSrc), [rawSrc]);

  const posterUrl = useMemo(() => {
    const p = (video as any)?.poster;
    return typeof p === "string" && p.trim() ? p.trim() : "";
  }, [video]);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  
  const [minTimePassed, setMinTimePassed] = useState(false);

  const [muted, setMuted] = useState<boolean>(() => readMuted());
  const [forcedMuted, setForcedMuted] = useState(false);
  const forcedMutedRef = useRef(false);

  const effectiveMuted = !isActive ? true : (forcedMutedRef.current ? true : muted);

  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const [likeCount, setLikeCount] = useState<number>(() =>
    Number(video.likeCount ?? 0)
  );
  const [liked, setLiked] = useState<boolean>(() =>
    readLikedSet().has(String(video.id))
  );

  const currentRef = useRef(0);
  const durationRef = useRef(0);
  const lastUiRef = useRef(0);
  const seekRef = useRef<HTMLInputElement | null>(null);

  const activeRef = useRef(isActive);
  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  const sentPlayRef = useRef(false);
  const userPausedRef = useRef(false);

  const jumpedRef = useRef(false);
  const seekingRef = useRef(false);
  const seekAttemptsRef = useRef(0);
  const seekDeadlineRef = useRef(0);

  const [frameOk, setFrameOk] = useState(false);
  const frameOkRef = useRef(false);

  const vAny = video as unknown as { affUrl?: string; affiliateUrl?: string };
  const affUrl = (vAny.affUrl ?? vAny.affiliateUrl) as string | undefined;

  useEffect(() => {
    sentPlayRef.current = false;
    userPausedRef.current = false;

    forcedMutedRef.current = false;
    setForcedMuted(false);

    jumpedRef.current = false;
    seekingRef.current = false;
    seekAttemptsRef.current = 0;
    seekDeadlineRef.current = performance.now() + 4500; 

    frameOkRef.current = false;
    setFrameOk(false);

    setReady(false);
    setPlaying(false);

    currentRef.current = 0;
    durationRef.current = 0;
    setCurrent(0);
    setDuration(0);

    setMinTimePassed(false);
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 3000); 

    return () => clearTimeout(timer);
  }, [video.id]);

  useEffect(() => {
    setLiked(readLikedSet().has(String(video.id)));
    setLikeCount(Number(video.likeCount ?? 0));
  }, [video.id, video.likeCount]);

  useEffect(() => {
    const on = () => setMuted(readMuted());
    window.addEventListener(EVT_MUTED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVT_MUTED, on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const getDurationLike = (el: HTMLVideoElement): number => {
    const d = el.duration;
    if (Number.isFinite(d) && d > 0) return d;
    try {
      const s = el.seekable;
      if (s && s.length > 0) {
        const end = s.end(s.length - 1);
        if (Number.isFinite(end) && end > 0) return end;
      }
    } catch {}
    const dr = durationRef.current;
    if (Number.isFinite(dr) && dr > 0) return dr;
    return 0;
  };

  const targetStart = (el: HTMLVideoElement) => {
    const dLike = getDurationLike(el);
    if (dLike > 0) return clamp(START_OFFSET_SEC, 0, Math.max(0, dLike - 0.01));
    return START_OFFSET_SEC;
  };

  const isAtTarget = (el: HTMLVideoElement, target: number) => {
    const t = Number.isFinite(el.currentTime) ? el.currentTime : currentRef.current || 0;
    return t >= target - 0.25;
  };

  const hardSeekToStart = async (reason: string) => {
    const el = videoRef.current;
    if (!el) return;
    if (!activeRef.current) return;
    if (jumpedRef.current) return;
    if (seekingRef.current) return;
    if (performance.now() > seekDeadlineRef.current) return;

    const target = targetStart(el);
    if (isAtTarget(el, target)) {
      jumpedRef.current = true;
      return;
    }

    if (seekAttemptsRef.current >= 10) return;

    seekingRef.current = true;
    seekAttemptsRef.current += 1;

    try {
      try {
        el.pause();
      } catch {}

      await sleep(120);

      try {
        // @ts-ignore
        if (typeof el.fastSeek === "function") {
          // @ts-ignore
          el.fastSeek(target);
        } else {
          el.currentTime = target;
        }
      } catch {}

      await sleep(120);

      if (isAtTarget(el, target)) {
        jumpedRef.current = true;
        currentRef.current = target;
        setCurrent(target);
        if (seekRef.current) seekRef.current.value = String(target);
      }

      if (activeRef.current && document.visibilityState === "visible" && !userPausedRef.current) {
        el.muted = effectiveMuted;
        try {
          await el.play();
          setPlaying(true);
        } catch {}
      }
    } finally {
      seekingRef.current = false;
    }
  };

  const tryResume = async (reason: string) => {
    const el = videoRef.current;
    if (!el) return;
    if (!activeRef.current) return;
    if (document.visibilityState !== "visible") return;
    if (userPausedRef.current) return;

    el.muted = effectiveMuted;

    try {
      await el.play();
      setPlaying(true);
      if (!sentPlayRef.current) {
        sentPlayRef.current = true;
        track(String(video.id), "play");
      }
    } catch (err: any) {
      setPlaying(false);

      if (!effectiveMuted && isNotAllowed(err)) {
        try {
          forcedMutedRef.current = true;
          setForcedMuted(true);
          el.muted = true;
          await el.play();
          setPlaying(true);
          if (!sentPlayRef.current) {
            sentPlayRef.current = true;
            track(String(video.id), "play");
          }
        } catch {}
      }
    }
  };

  useEffect(() => {
    const onVis = () => {
      const el = videoRef.current;
      if (!el) return;

      if (document.visibilityState !== "visible") {
        try {
          el.pause();
        } catch {}
        setPlaying(false);
      } else {
        if (isActive && !userPausedRef.current) {
          tryResume("visibility");
        }
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, muted, forcedMuted, src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    setReady(false);

    try {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    } catch {}

    try {
      // @ts-ignore
      el.poster = posterUrl || "";
    } catch {}

    try {
      el.preload = "auto";
    } catch {}

    if (isHlsUrl(rawSrc)) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: false,
          capLevelToPlayerSize: true,
          backBufferLength: 10,
          maxBufferLength: 20,
          startPosition: START_OFFSET_SEC,
        });
        hlsRef.current = hls;
        hls.loadSource(rawSrc);
        hls.attachMedia(el);

        hls.on(Hls.Events.MANIFEST_PARSED, () => setReady(true));
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data?.fatal) {
            try {
              hls.destroy();
            } catch {}
            hlsRef.current = null;
            try {
              el.src = rawSrc;
              setReady(true);
            } catch {}
          }
        });
      } else {
        el.src = rawSrc; 
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
  }, [rawSrc, src, posterUrl]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.muted = effectiveMuted;

    if (!isActive) {
      try {
        el.pause();
      } catch {}
      setPlaying(false);
      return;
    }

    userPausedRef.current = false;
    tryResume("active");

    window.setTimeout(() => hardSeekToStart("active_kick"), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, muted, forcedMuted, video.id, src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const updateDuration = () => {
      const dLike = getDurationLike(el);
      durationRef.current = dLike;
      setDuration(dLike);
      if (seekRef.current) seekRef.current.max = String(Math.max(0, dLike || 0));
    };

    const onLoadedMeta = () => {
      updateDuration();
      setReady(true);
      hardSeekToStart("loadedmeta");
    };

    const onLoadedData = () => {
      frameOkRef.current = true;
      setFrameOk(true);
      hardSeekToStart("loadeddata");
    };

    const onPlaying = () => {
      setPlaying(true);
      frameOkRef.current = true;
      setFrameOk(true);
      hardSeekToStart("playing");
    };

    const onTime = () => {
      const t = el.currentTime || 0;
      currentRef.current = t;

      const now = performance.now();
      if (now - lastUiRef.current >= 200) {
        lastUiRef.current = now;
        setCurrent(t);
      }

      const target = targetStart(el);
      if (!jumpedRef.current && t >= target - 0.25) {
        jumpedRef.current = true;
      }

      if (!jumpedRef.current && t > 0.05 && t < target - 0.25) {
        hardSeekToStart("timeupdate");
      }
    };

    const onPause = () => {
      setPlaying(false);
      if (!activeRef.current) return;
      if (document.visibilityState !== "visible") return;
      if (userPausedRef.current) return;
      window.setTimeout(() => tryResume("pause"), 120);
    };

    el.addEventListener("loadedmetadata", onLoadedMeta);
    el.addEventListener("durationchange", onLoadedMeta);
    el.addEventListener("loadeddata", onLoadedData);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMeta);
      el.removeEventListener("durationchange", onLoadedMeta);
      el.removeEventListener("loadeddata", onLoadedData);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("pause", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, muted, forcedMuted, video.id]);

  const rvfcIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isActive) return;

    let stopped = false;

    const stopAll = () => {
      stopped = true;
      const elAny = videoRef.current as any;
      if (elAny && typeof elAny.cancelVideoFrameCallback === "function" && rvfcIdRef.current != null) {
        try {
          elAny.cancelVideoFrameCallback(rvfcIdRef.current);
        } catch {}
      }
      rvfcIdRef.current = null;
    };

    const elAny = videoRef.current as any;
    if (!elAny || typeof elAny.requestVideoFrameCallback !== "function") return;

    const onFrame = (_now: number, meta: any) => {
      if (stopped) return;

      const el = videoRef.current;
      if (el) {
        const mt = Number(meta?.mediaTime);
        if (Number.isFinite(mt) && mt >= 0) {
          currentRef.current = mt;

          const now = performance.now();
          if (now - lastUiRef.current >= 120) {
            lastUiRef.current = now;
            setCurrent(mt);
          }

          if (!jumpedRef.current) {
            const target = targetStart(el);
            if (mt >= target - 0.25) {
              jumpedRef.current = true;
            } else if (mt > 0.05 && mt < target - 0.25) {
              hardSeekToStart("rvfc");
            }
          }
        }

        const dLike = getDurationLike(el);
        if (Number.isFinite(dLike) && dLike > 0 && dLike !== durationRef.current) {
          durationRef.current = dLike;
          setDuration(dLike);
          if (seekRef.current) seekRef.current.max = String(dLike);
        }
      }

      try {
        rvfcIdRef.current = elAny.requestVideoFrameCallback(onFrame);
      } catch {}
    };

    try {
      rvfcIdRef.current = elAny.requestVideoFrameCallback(onFrame);
    } catch {}

    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, video.id, src]);

  const stop = (e: any) => {
    e?.stopPropagation?.();
    try {
      e?.nativeEvent?.stopImmediatePropagation?.();
    } catch {}
  };

  const togglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      userPausedRef.current = false;
      tryResume("toggle_play");
    } else {
      userPausedRef.current = true;
      try {
        el.pause();
      } catch {}
      setPlaying(false);
    }
  };

  const toggleMute = async () => {
    const el = videoRef.current;
    if (!el) return;

    const next = !muted;

    if (!next) {
      forcedMutedRef.current = false;
      setForcedMuted(false);
    }

    setMuted(next);
    writeMuted(next);

    el.muted = isActive ? (forcedMutedRef.current ? true : next) : true;

    if (isActive) {
      try {
        await el.play();
        setPlaying(true);
      } catch {}
    }
  };

  const seekTo = (t: number) => {
    const el = videoRef.current;
    if (!el) return;
    const dLike = getDurationLike(el);
    const next = clamp(t, 0, dLike || t);
    try {
      // @ts-ignore
      if (typeof el.fastSeek === "function") {
        // @ts-ignore
        el.fastSeek(next);
      } else {
        el.currentTime = next;
      }
    } catch {}
  };

  const skip = (sec: number) => {
    const el = videoRef.current;
    if (!el) return;
    const base = Number.isFinite(el.currentTime) ? el.currentTime : currentRef.current;
    seekTo(base + sec);
  };

  const titleText = useMemo(() => video.title || rawSrc || "", [video.title, rawSrc]);
  const showPR = !!affUrl;

  const onToggleLike = async (e: any) => {
    stop(e);

    const id = String(video.id);
    const set = readLikedSet();
    const was = set.has(id);
    const nextLiked = !was;

    const nextCount = Math.max(0, (likeCount ?? 0) + (nextLiked ? 1 : -1));
    setLikeCount(nextCount);
    setLiked(nextLiked);

    if (nextLiked) set.add(id);
    else set.delete(id);
    writeLikedSet(set);

    try {
      const r = await fetch("/api/likes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId: id, delta: nextLiked ? 1 : -1 }),
      });
      const j = await r.json().catch(() => null);
      const serverCount = Number(j?.count);
      if (r.ok && j?.ok && Number.isFinite(serverCount)) {
        setLikeCount(serverCount);
        window.dispatchEvent(
          new CustomEvent(EVT_LIKES, { detail: { videoId: id, count: serverCount } })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent(EVT_LIKES, { detail: { videoId: id, count: nextCount } })
        );
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent(EVT_LIKES, { detail: { videoId: id, count: nextCount } })
      );
    }
  };

  const onShare = async (e: any) => {
    stop(e);

    const shareUrl = `https://swipe-video-feed.vercel.app/video/${encodeURIComponent(
      String(video.id)
    )}`;

    const text = titleText || "Swipe Video Feed";

    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        // @ts-ignore
        await navigator.share({ title: text, text, url: shareUrl });
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("共有URLをコピーした");
    } catch {
      prompt("このURLをコピーして共有してな", shareUrl);
    }
  };

  const tapRef = useRef({ 
    downX: 0, 
    downY: 0, 
    downT: 0, 
    moved: false,
    lastTapT: 0,
    singleTapTimer: null as any
  });

  const onVideoPointerDown = (e: React.PointerEvent) => {
    tapRef.current.downX = e.clientX;
    tapRef.current.downY = e.clientY;
    tapRef.current.downT = performance.now();
    tapRef.current.moved = false;
  };

  const onVideoPointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - tapRef.current.downX;
    const dy = e.clientY - tapRef.current.downY;
    if (Math.abs(dx) + Math.abs(dy) > TAP_MOVE_PX) tapRef.current.moved = true;
  };

  const onVideoPointerUp = (e: React.PointerEvent) => {
    const dt = performance.now() - tapRef.current.downT;
    if (tapRef.current.moved) return;
    if (dt > TAP_MAX_MS) return;

    const now = performance.now();
    const timeSinceLastTap = now - tapRef.current.lastTapT;

    if (timeSinceLastTap < 400) { 
      clearTimeout(tapRef.current.singleTapTimer);
      tapRef.current.lastTapT = 0;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;

      if (clickX > rect.width / 2) {
        skip(5);
      } else {
        skip(-5);
      }
    } else {
      tapRef.current.lastTapT = now;
      clearTimeout(tapRef.current.singleTapTimer);
      tapRef.current.singleTapTimer = setTimeout(() => {
        togglePlay();
        tapRef.current.lastTapT = 0;
      }, 400); 
    }
  };

  const showTapSound = isActive && effectiveMuted;

  const enableSoundFromUser = async (e?: any) => {
    stop(e);

    const el = videoRef.current;
    if (!el) return;

    forcedMutedRef.current = false;
    setForcedMuted(false);

    setMuted(false);
    writeMuted(false);

    el.muted = false;

    try {
      await el.play();
      setPlaying(true);
      if (!sentPlayRef.current) {
        sentPlayRef.current = true;
        track(String(video.id), "play");
      }
    } catch {}
  };

  const showBlackCover = !posterUrl && !frameOk;

  const showLoadingOverlay = !ready || !minTimePassed;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "black", overflow: "hidden", touchAction: "pan-y" }}>
      <video
        ref={videoRef}
        playsInline
        // @ts-ignore
        webkit-playsinline="true"
        muted={effectiveMuted}
        preload="auto"
        poster={posterUrl || undefined}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          background: "black",
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
        onPointerDown={onVideoPointerDown}
        onPointerMove={onVideoPointerMove}
        onPointerUp={onVideoPointerUp}
      />

      {showBlackCover ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "black", pointerEvents: "none" }} />
      ) : null}

      {showLoadingOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "black",
            color: "rgba(255,255,255,0.8)",
            pointerEvents: "none",
            gap: 20,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: "bold" }}>動画を読み込み中...</div>
          <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.8 }}>
            <div>⬆︎ 上にスワイプで次の動画</div>
            <div>ダブルタップで5秒スキップ</div>
          </div>
        </div>
      )}

      {showPR ? (
        <div
          style={{
            position: "absolute",
            top: "calc(env(safe-area-inset-top) + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <span
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.6,
              color: "rgba(255,255,255,0.70)",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            PR
          </span>
        </div>
      ) : null}

      {showTapSound ? (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 30, pointerEvents: "auto" }}>
          <button
            onPointerDown={enableSoundFromUser}
            onClick={enableSoundFromUser}
            style={{
              padding: "18px 22px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(0,0,0,0.20)",
              color: "rgba(255,255,255,0.78)",
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: 0.6,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 14px 40px rgba(0,0,0,0.30)",
              userSelect: "none",
            }}
          >
            タップで音ON
          </button>
        </div>
      ) : null}

      <div
        data-no-swipe="1"
        data-ui="controls"
        style={{
          position: "absolute",
          left: "calc(env(safe-area-inset-left) + 10px)",
          right: "calc(env(safe-area-inset-right) + 10px)",
          bottom: "calc(env(safe-area-inset-bottom) + 10px)",
          zIndex: 40,
          overflowX: "hidden",
          touchAction: "pan-y",
          opacity: isActive ? 1 : 0,
          pointerEvents: isActive ? "auto" : "none",
          transition: "opacity 160ms ease-out",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={outerTopBar}>
          <div style={outerLeft}>
            <button
              onPointerDown={(e) => (e.stopPropagation(), e.preventDefault())}
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              style={outerBtn}
            >
              {effectiveMuted ? "音OFF" : "音ON"}
            </button>
          </div>

          <div />

          <div style={outerRight}>
            <button
              onPointerDown={(e) => (e.stopPropagation(), e.preventDefault())}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              style={outerBtn}
            >
              {playing ? "停止" : "再生"}
            </button>
          </div>
        </div>

        <div style={panel}>
          <div style={titleClamp}>{titleText}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, minWidth: 42 }}>
              {formatTime(current)}
            </span>

            <input
              ref={seekRef}
              data-no-swipe="1"
              data-ui="controls"
              type="range"
              min={0}
              max={Math.max(0, duration || 0)}
              step={0.01}
              value={Math.min(Math.max(0, current || 0), Math.max(0, duration || 0))}
              onPointerDown={(e) => (e.stopPropagation(), e.preventDefault())}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => seekTo(Number((e.target as HTMLInputElement).value))}
              style={{ width: "100%" }}
            />

            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, minWidth: 42, textAlign: "right" }}>
              {formatTime(duration)}
            </span>
          </div>

          <div style={oneRowWrap}>
            <div style={oneRowInner}>
              <button
                onPointerDown={(e) => (e.stopPropagation(), e.preventDefault())}
                onClick={onToggleLike}
                style={{
                  ...pillBtnSmall,
                  background: liked ? "rgba(255,255,255,0.92)" : pillBtnSmall.background,
                  color: liked ? "#000" : pillBtnSmall.color,
                  border: liked ? "1px solid rgba(255,255,255,0.85)" : pillBtnSmall.border,
                }}
              >
                {liked ? "♥" : "♡"} {likeCount}
              </button>

              <button onPointerDown={(e) => (e.stopPropagation(), e.preventDefault())} onClick={() => skip(-10)} style={pillBtnSmall}>
                -10
              </button>
              <button onPointerDown={(e) => (e.stopPropagation(), e.preventDefault())} onClick={() => skip(-5)} style={pillBtnSmall}>
                -5
              </button>

              {affUrl ? (
                <a
                  onPointerDown={(e) => (e.stopPropagation(), e.preventDefault())}
                  onClick={(e) => {
                    e.stopPropagation();
                    track(String(video.id), "aff_click");
                  }}
                  href={affUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={productMainBtn}
                >
                  本編
                </a>
              ) : (
                <div style={{ width: 56, height: 56, flex: "0 0 auto" }} />
              )}

              <button onPointerDown={(e) => (e.stopPropagation(), e.preventDefault())} onClick={() => skip(5)} style={pillBtnSmall}>
                +5
              </button>
              <button onPointerDown={(e) => (e.stopPropagation(), e.preventDefault())} onClick={() => skip(10)} style={pillBtnSmall}>
                +10
              </button>

              <button
                onPointerDown={(e) => (e.stopPropagation(), e.preventDefault())}
                onClick={onShare}
                style={pillBtnSmall}
              >
                共有
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const titleClamp: React.CSSProperties = {
  color: "rgba(255,255,255,0.92)",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "normal",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitBoxOrient: "vertical" as any,
  WebkitLineClamp: 4 as any,
  textAlign: "center",
  lineHeight: 1.35,
};

const panel: React.CSSProperties = {
  borderRadius: 18,
  padding: 10,
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
  display: "grid",
  gap: 8,
  maxWidth: "min(560px, 100%)",
  margin: "0 auto",
};

const outerTopBar: React.CSSProperties = {
  maxWidth: "min(560px, 100%)",
  margin: "0 auto",
  marginBottom: 8,
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
};

const outerLeft: React.CSSProperties = {
  display: "inline-flex",
  gap: 8,
  alignItems: "center",
};

const outerRight: React.CSSProperties = {
  display: "inline-flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "flex-end",
};

const outerBtn: React.CSSProperties = {
  height: 30,
  padding: "0 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(255,255,255,0.16)",
  fontWeight: 900,
  fontSize: 10,
  lineHeight: 1,
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  flex: "0 0 auto",
};

const oneRowWrap: React.CSSProperties = {
  overflowX: "hidden",
  overflowY: "visible",
  paddingBottom: 2,
  textAlign: "center",
  touchAction: "pan-y",
  overscrollBehaviorX: "none" as any,
};

const oneRowInner: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  flexWrap: "nowrap",
  minWidth: "max-content",
};

const pillBtnSmall: React.CSSProperties = {
  minWidth: 16,
  height: 35,
  padding: "0 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(255,255,255,0.16)",
  fontWeight: 900,
  fontSize: 11,
  lineHeight: 1,
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  flex: "0 0 auto",
};

const productMainBtn: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 999,
  background: "#fff",
  color: "#000",
  textDecoration: "none",
  fontWeight: 900,
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  border: "1px solid rgba(0,0,0,0.08)",
  flex: "0 0 auto",
};