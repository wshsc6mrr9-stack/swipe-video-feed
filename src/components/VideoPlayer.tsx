"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { VideoMeta } from "@/lib/types";

type Props = {
  video: VideoMeta & { likeCount?: number; duration?: number };
  isActive?: boolean;
  isNeighbor?: boolean;
};

const START_OFFSET_SEC = 7;
const KEY_LIKED = "liked_videos_v1";
const EVT_LIKES = "likes_changed_v1";
const KEY_MUTED = "audio_muted_v1";
const DOUBLE_TAP_MS = 220;

function formatTime(t: number) {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDurationOrUnknown(t: number) {
  if (!Number.isFinite(t) || t <= 0) return "--:--";
  return formatTime(t);
}

function waitForEvent(
  el: HTMLVideoElement,
  eventName: string,
  timeoutMs = 1600
) {
  return new Promise<void>((resolve) => {
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener(eventName, onEvent);
      clearTimeout(timer);
      resolve();
    };

    const onEvent = () => finish();
    const timer = window.setTimeout(finish, timeoutMs);

    el.addEventListener(eventName, onEvent, { once: true });
  });
}

function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function readLikedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY_LIKED);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(String));
  } catch {}
  return new Set();
}

function writeLikedSet(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_LIKED, JSON.stringify(Array.from(set)));
  } catch {}
}

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
  const leftTapAtRef = useRef(0);
  const rightTapAtRef = useRef(0);
  const startOffsetAppliedRef = useRef(false);
  const userSeekedRef = useRef(false);
  const ensureOffsetRunningRef = useRef(false);
  const neighborPrimedRef = useRef(false);

  const rawSrc = (video.url ?? (video as any).src ?? "") as string;

  const [playing, setPlaying] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [muted, setMuted] = useState<boolean>(() => readMutedPreference());
  const [showTapToUnmute, setShowTapToUnmute] = useState(false);
  const [duration, setDuration] = useState<number>(() =>
    Number((video as any).duration ?? 0)
  );
  const [current, setCurrent] = useState(START_OFFSET_SEC);
  const [likeCount, setLikeCount] = useState<number>(() =>
    Number(video.likeCount ?? 0)
  );
  const [liked, setLiked] = useState<boolean>(() =>
    readLikedSet().has(String(video.id))
  );
  const [skipToast, setSkipToast] = useState<{
    id: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    setPlaying(false);
    setCurrent(START_OFFSET_SEC);
    setDuration(Number((video as any).duration ?? 0));
    setLikeCount(Number(video.likeCount ?? 0));
    setLiked(readLikedSet().has(String(video.id)));
    setShowTapToUnmute(false);
    setSkipToast(null);
    setVideoStarted(false);
    setIsBuffering(true);
    startOffsetAppliedRef.current = false;
    userSeekedRef.current = false;
    ensureOffsetRunningRef.current = false;
    neighborPrimedRef.current = false;
    leftTapAtRef.current = 0;
    rightTapAtRef.current = 0;
  }, [video.id, video.likeCount, (video as any).duration]);

  useEffect(() => {
    if (!skipToast) return;
    const t = window.setTimeout(() => setSkipToast(null), 650);
    return () => window.clearTimeout(t);
  }, [skipToast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEY_MUTED, muted ? "1" : "0");
    } catch {}
  }, [muted]);

  function getBestDuration(el: HTMLVideoElement) {
    const candidates: number[] = [];

    const incomingDuration = Number((video as any).duration ?? 0);
    if (Number.isFinite(incomingDuration) && incomingDuration > 0) {
      candidates.push(incomingDuration);
    }

    if (Number.isFinite(el.duration) && el.duration > 0) {
      candidates.push(el.duration);
    }

    if (el.seekable && el.seekable.length > 0) {
      try {
        const seekableEnd = el.seekable.end(el.seekable.length - 1);
        if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
          candidates.push(seekableEnd);
        }
      } catch {}
    }

    const hls = hlsRef.current;
    const currentLevel = hls?.currentLevel ?? -1;
    const level =
      currentLevel >= 0 ? hls?.levels?.[currentLevel] : hls?.levels?.[0];
    const details = level?.details as any;
    if (Number.isFinite(details?.totalduration) && details.totalduration > 0) {
      candidates.push(details.totalduration);
    }

    return candidates.length ? Math.max(...candidates) : 0;
  }

  function syncDurationFromElement(el: HTMLVideoElement) {
    const next = getBestDuration(el);
    if (next > 0) {
      setDuration((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
    }
  }

  function getSeekableStart(el: HTMLVideoElement) {
    try {
      if (el.seekable && el.seekable.length > 0) {
        const v = el.seekable.start(0);
        if (Number.isFinite(v)) return v;
      }
    } catch {}
    return 0;
  }

  function getSeekableEnd(el: HTMLVideoElement) {
    try {
      if (el.seekable && el.seekable.length > 0) {
        const v = el.seekable.end(el.seekable.length - 1);
        if (Number.isFinite(v)) return v;
      }
    } catch {}
    return getBestDuration(el);
  }

  function getSafeStartTarget(el: HTMLVideoElement) {
    const seekableStart = getSeekableStart(el);
    const seekableEnd = getSeekableEnd(el);

    if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
      return Math.max(
        seekableStart,
        Math.min(START_OFFSET_SEC, Math.max(seekableStart, seekableEnd - 0.15))
      );
    }

    return START_OFFSET_SEC;
  }

  async function ensureStartOffsetLocked(
    el: HTMLVideoElement,
    force = false,
    retries = 3
  ) {
    if (!isActive && !isNeighbor && !force) return;
    if (!force && userSeekedRef.current) return;
    if (!force && startOffsetAppliedRef.current && el.currentTime >= START_OFFSET_SEC - 0.7) {
      return;
    }
    if (ensureOffsetRunningRef.current) return;

    ensureOffsetRunningRef.current = true;

    try {
      if (el.readyState < 1) {
        await waitForEvent(el, "loadedmetadata", 1600);
      }

      for (let i = 0; i < retries; i++) {
        if (userSeekedRef.current && !force) return;

        const target = getSafeStartTarget(el);

        if (Math.abs(el.currentTime - target) <= 0.55) {
          startOffsetAppliedRef.current = true;
          setCurrent(target);
          syncDurationFromElement(el);
          return;
        }

        try {
          el.currentTime = target;
        } catch {}

        await Promise.race([
          waitForEvent(el, "seeked", 700),
          waitForEvent(el, "timeupdate", 700),
          waitMs(100),
        ]);

        syncDurationFromElement(el);
        setCurrent(el.currentTime || target);

        if (Math.abs(el.currentTime - target) <= 0.75) {
          startOffsetAppliedRef.current = true;
          setCurrent(target);
          return;
        }
      }

      const fallbackTarget = getSafeStartTarget(el);
      if (Math.abs(el.currentTime - fallbackTarget) <= 1.0) {
        startOffsetAppliedRef.current = true;
        setCurrent(fallbackTarget);
      }
    } finally {
      ensureOffsetRunningRef.current = false;
    }
  }

  async function primeNeighborFrame(el: HTMLVideoElement) {
    if (!isNeighbor) return;
    if (neighborPrimedRef.current) return;

    try {
      if (el.readyState < 1) {
        await waitForEvent(el, "loadedmetadata", 1800);
      }

      await ensureStartOffsetLocked(el, true, 2);

      el.muted = true;

      try {
        await el.play();
        await waitNextFrame();
        await Promise.race([
          waitForEvent(el, "timeupdate", 240),
          waitForEvent(el, "loadeddata", 240),
          waitMs(120),
        ]);
        el.pause();
      } catch {}

      const target = getSafeStartTarget(el);
      setCurrent(el.currentTime >= target - 1 ? target : el.currentTime || target);
      syncDurationFromElement(el);
      setVideoStarted(true);
      setIsBuffering(false);
      neighborPrimedRef.current = true;
    } catch {}
  }

  async function playWithSafariFallback(
    el: HTMLVideoElement,
    wantsAudio: boolean
  ) {
    if (!userSeekedRef.current) {
      await ensureStartOffsetLocked(el, true, 2);
    }

    try {
      el.muted = !wantsAudio;
      await el.play();
      setPlaying(true);
      setVideoStarted(true);
      setIsBuffering(false);
      syncDurationFromElement(el);

      if (!userSeekedRef.current) {
        const target = getSafeStartTarget(el);
        if (el.currentTime < target - 0.8) {
          await ensureStartOffsetLocked(el, true, 2);
        }
        setCurrent(target);
      } else {
        setCurrent(el.currentTime);
      }

      if (wantsAudio) {
        setMuted(false);
        setShowTapToUnmute(false);
      } else {
        setMuted(true);
        setShowTapToUnmute(isActive);
      }

      return true;
    } catch {
      try {
        el.muted = true;
        await el.play();
        setPlaying(true);
        setVideoStarted(true);
        setIsBuffering(false);
        syncDurationFromElement(el);

        if (!userSeekedRef.current) {
          const target = getSafeStartTarget(el);
          if (el.currentTime < target - 0.8) {
            await ensureStartOffsetLocked(el, true, 2);
          }
          setCurrent(target);
        } else {
          setCurrent(el.currentTime);
        }

        setMuted(true);
        setShowTapToUnmute(isActive);
        return true;
      } catch {
        setPlaying(false);
        return false;
      }
    }
  }

  async function seekBy(delta: number) {
    const el = videoRef.current;
    if (!el) return;

    const bestDuration = getBestDuration(el);
    const maxTime = bestDuration > 0 ? bestDuration : Number.POSITIVE_INFINITY;
    const nextTime = Math.max(0, Math.min(el.currentTime + delta, maxTime));

    userSeekedRef.current = true;

    try {
      el.currentTime = nextTime;
      setCurrent(nextTime);
      syncDurationFromElement(el);
      setSkipToast({
        id: Date.now(),
        label: delta > 0 ? `+${Math.abs(delta)}秒` : `-${Math.abs(delta)}秒`,
      });
    } catch {}
  }

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

    startOffsetAppliedRef.current = false;
    userSeekedRef.current = false;
    ensureOffsetRunningRef.current = false;
    neighborPrimedRef.current = false;
    setIsBuffering(true);

    const onLoadedMetadata = () => {
      syncDurationFromElement(el);

      if (isActive && !userSeekedRef.current) {
        void ensureStartOffsetLocked(el, true, 2);
      }

      if (isNeighbor && !neighborPrimedRef.current) {
        void primeNeighborFrame(el);
      }
    };

    const onDurationChange = () => {
      syncDurationFromElement(el);
    };

    const onLoadedData = () => {
      syncDurationFromElement(el);
      if (isActive) {
        setVideoStarted(true);
        setIsBuffering(false);
      } else if (isNeighbor) {
        setVideoStarted(true);
      }
    };

    const onCanPlay = () => {
      syncDurationFromElement(el);
      if (isActive) {
        setVideoStarted(true);
        setIsBuffering(false);
      } else if (isNeighbor) {
        setVideoStarted(true);
      }
    };

    const onWaiting = () => {
      if (isActive) setIsBuffering(true);
    };

    const onPlaying = () => {
      setPlaying(true);
      setVideoStarted(true);
      setIsBuffering(false);
      syncDurationFromElement(el);

      if (!userSeekedRef.current) {
        const target = getSafeStartTarget(el);
        if (el.currentTime < target - 0.8) {
          void ensureStartOffsetLocked(el, true, 2);
        } else {
          setCurrent(target);
          startOffsetAppliedRef.current = true;
        }
      }
    };

    const onPause = () => setPlaying(false);

    const onProgress = () => syncDurationFromElement(el);

    const onSeeking = () => {
      if (isActive) setIsBuffering(true);
      syncDurationFromElement(el);
    };

    const onSeeked = () => {
      syncDurationFromElement(el);
      if (!userSeekedRef.current && (isActive || isNeighbor)) {
        const target = getSafeStartTarget(el);
        if (Math.abs(el.currentTime - target) <= 1.0) {
          setCurrent(target);
          startOffsetAppliedRef.current = true;
        } else {
          setCurrent(el.currentTime);
        }
      } else {
        setCurrent(el.currentTime);
      }
      if (isActive) {
        setIsBuffering(false);
      }
    };

    const onTimeUpdate = () => {
      syncDurationFromElement(el);

      if (!userSeekedRef.current && (isActive || isNeighbor)) {
        const target = getSafeStartTarget(el);
        if (el.currentTime >= target - 0.8) {
          setCurrent(target);
          startOffsetAppliedRef.current = true;
        } else {
          setCurrent(el.currentTime);
        }
      } else {
        setCurrent(el.currentTime);
      }

      if (el.currentTime > 0.1) {
        setVideoStarted(true);
        if (isActive) setIsBuffering(false);
      }
    };

    const onEnded = () => {
      setIsBuffering(false);
    };

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("loadeddata", onLoadedData);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);
    el.addEventListener("progress", onProgress);
    el.addEventListener("seeking", onSeeking);
    el.addEventListener("seeked", onSeeked);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);

    if (rawSrc.includes(".m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          startPosition: isActive || isNeighbor ? START_OFFSET_SEC : -1,
          maxBufferLength: isActive ? 6 : 3,
          maxMaxBufferLength: isActive ? 12 : 6,
          backBufferLength: 0,
          enableWorker: true,
          lowLatencyMode: true,
          startFragPrefetch: isNeighbor,
          testBandwidth: false,
        } as any);

        hlsRef.current = hls;
        hls.loadSource(rawSrc);
        hls.attachMedia(el);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          syncDurationFromElement(el);
          if (isNeighbor && !neighborPrimedRef.current) {
            void primeNeighborFrame(el);
          }
        });

        hls.on(Hls.Events.LEVEL_LOADED, (_event, data: any) => {
          const total = Number(data?.details?.totalduration ?? 0);
          if (total > 0) {
            setDuration(total);
          } else {
            syncDurationFromElement(el);
          }
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          syncDurationFromElement(el);
        });

        hls.on(Hls.Events.BUFFER_APPENDED, () => {
          syncDurationFromElement(el);
        });
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
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("loadeddata", onLoadedData);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("progress", onProgress);
      el.removeEventListener("seeking", onSeeking);
      el.removeEventListener("seeked", onSeeked);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.id, rawSrc, isActive, isNeighbor]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;

    const run = async () => {
      if (isActive) {
        if (!userSeekedRef.current) {
          try {
            await ensureStartOffsetLocked(el, true, 2);
          } catch {}
        }

        if (cancelled) return;
        await playWithSafariFallback(el, !muted);
        return;
      }

      if (isNeighbor) {
        setShowTapToUnmute(false);
        el.pause();
        setPlaying(false);
        if (!neighborPrimedRef.current) {
          void primeNeighborFrame(el);
        }
        return;
      }

      setShowTapToUnmute(false);
      el.pause();
      setPlaying(false);
      setIsBuffering(false);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isActive, isNeighbor]);

  const togglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      await playWithSafariFallback(el, !muted);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const handleTapToUnmute = async () => {
    const el = videoRef.current;
    if (!el) return;

    setMuted(false);
    setShowTapToUnmute(false);
    await playWithSafariFallback(el, true);
  };

  const handleLeftTap = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const now = Date.now();

    if (now - leftTapAtRef.current <= DOUBLE_TAP_MS) {
      leftTapAtRef.current = 0;
      void seekBy(-5);
      return;
    }

    leftTapAtRef.current = now;
  };

  const handleRightTap = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const now = Date.now();

    if (now - rightTapAtRef.current <= DOUBLE_TAP_MS) {
      rightTapAtRef.current = 0;
      void seekBy(5);
      return;
    }

    rightTapAtRef.current = now;
  };

  const toggleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    const id = String(video.id);
    const set = readLikedSet();
    let nextLiked = liked;
    let nextCount = likeCount;

    if (set.has(id)) {
      set.delete(id);
      nextLiked = false;
      nextCount = Math.max(0, likeCount - 1);
    } else {
      set.add(id);
      nextLiked = true;
      nextCount = likeCount + 1;
    }

    writeLikedSet(set);
    setLiked(nextLiked);
    setLikeCount(nextCount);

    window.dispatchEvent(
      new CustomEvent(EVT_LIKES, {
        detail: {
          videoId: id,
          count: nextCount,
        },
      })
    );
  };

  const handleShare = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const deepLink = `${origin}/video/${encodeURIComponent(String(video.id))}`;
      const fallbackUrl =
        String((video as any).pageUrl || "").trim() || deepLink;

      const shareData = {
        title: String(video.title || "動画"),
        text: String(video.title || "動画"),
        url: deepLink,
      };

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(deepLink || fallbackUrl);
        alert("リンクをコピーしました");
        return;
      }

      if (typeof window !== "undefined") {
        window.prompt("このリンクをコピーしてください", deepLink || fallbackUrl);
      }
    } catch {}
  };

  const displayDuration = duration > 0
    ? duration
    : Number((video as any).duration ?? 0) > 0
      ? Number((video as any).duration ?? 0)
      : 0;

  const hasDuration = Number.isFinite(displayDuration) && displayDuration > 0;
  const sliderMin = 0;
  const sliderMax = hasDuration ? displayDuration : START_OFFSET_SEC;
  const sliderValue = hasDuration
    ? Math.min(Math.max(current, sliderMin), sliderMax)
    : START_OFFSET_SEC;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        playsInline
        preload={isActive || isNeighbor ? "auto" : "none"}
        muted={!isActive || muted}
        poster=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          position: "absolute",
          inset: 0,
          zIndex: 1,
          opacity: videoStarted || isNeighbor ? 1 : 0.08,
          transition: "opacity 0.12s linear",
          background: "#000",
        }}
      />

      {isActive && isBuffering && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.22))",
            pointerEvents: "none",
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top) + 10px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 41,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            height: 34,
            padding: "0 18px",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.28)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: "0.18em",
            backdropFilter: "blur(10px)",
          }}
        >
          PR
        </div>
      </div>

      {isActive && (
        <>
          <div
            onClick={handleLeftTap}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "34%",
              zIndex: 12,
              background: "transparent",
            }}
          />
          <div
            onClick={handleRightTap}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "34%",
              zIndex: 12,
              background: "transparent",
            }}
          />
          <div
            onClick={() => {
              void togglePlay();
            }}
            style={{
              position: "absolute",
              left: "34%",
              right: "34%",
              top: 0,
              bottom: 0,
              zIndex: 11,
              background: "transparent",
            }}
          />
        </>
      )}

      {isActive && skipToast && (
        <div
          style={{
            position: "absolute",
            top: "calc(env(safe-area-inset-top) + 84px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 26,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              minWidth: 120,
              height: 44,
              padding: "0 20px",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.42)",
              border: "1px solid rgba(255,255,255,0.16)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 18,
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
            {skipToast.label}
          </div>
        </div>
      )}

      {isActive && showTapToUnmute && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            void handleTapToUnmute();
          }}
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

      <div
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          bottom: "calc(env(safe-area-inset-bottom) + 12px)",
          zIndex: 40,
          opacity: isActive ? 1 : 0,
          pointerEvents: isActive ? "auto" : "none",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            marginBottom: 10,
            width: "min(560px, calc(100vw - 20px))",
            maxWidth: "100%",
            marginInline: "auto",
            boxSizing: "border-box",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextMuted = !muted;
              setMuted(nextMuted);
              setShowTapToUnmute(nextMuted);

              const el = videoRef.current;
              if (el) {
                el.muted = nextMuted;
                if (!nextMuted && !el.paused) {
                  el.muted = false;
                }
              }
            }}
            style={outerBtnStyle}
          >
            {muted ? "音OFF" : "音ON"}
          </button>

          <div />

          <button
            onClick={(e) => {
              e.stopPropagation();
              void togglePlay();
            }}
            style={outerBtnStyle}
          >
            {playing ? "停止" : "再生"}
          </button>
        </div>

        <div
          style={{
            ...panelStyle,
            width: "min(560px, calc(100vw - 20px))",
            maxWidth: "100%",
          }}
        >
          <div style={titleStyle}>{video.title || "Untitled"}</div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <span style={timeStyle}>{formatTime(current)}</span>

            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={0.01}
              value={sliderValue}
              onChange={(e) => {
                if (!hasDuration || !videoRef.current) return;
                const nextTime = Number(e.target.value);
                userSeekedRef.current = true;
                videoRef.current.currentTime = nextTime;
                setCurrent(nextTime);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                width: "100%",
                accentColor: "#fff",
              }}
            />

            <span style={timeStyle}>
              {formatDurationOrUnknown(displayDuration)}
            </span>
          </div>

          <div style={{ width: "100%", overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "nowrap",
                overflowX: "auto",
                overflowY: "hidden",
                WebkitOverflowScrolling: "touch",
                justifyContent: "flex-start",
                width: "100%",
                paddingBottom: 2,
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <button onClick={toggleLike} style={pillBtnSmall}>
                {liked ? "♥" : "♡"} {likeCount}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void seekBy(-10);
                }}
                style={pillBtnSmall}
              >
                -10
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void seekBy(-5);
                }}
                style={pillBtnSmall}
              >
                -5
              </button>

              {(video as any).affUrl && (
                <a
                  href={(video as any).affUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={productMainBtn}
                >
                  本編
                </a>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void seekBy(5);
                }}
                style={pillBtnSmall}
              >
                +5
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void seekBy(10);
                }}
                style={pillBtnSmall}
              >
                +10
              </button>

              <button onClick={handleShare} style={pillBtnSmall}>
                共有
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: "12px 14px",
  background: "rgba(0,0,0,0.5)",
  border: "1px solid rgba(255,255,255,0.15)",
  display: "grid",
  gap: 10,
  margin: "0 auto",
  backdropFilter: "blur(15px)",
  boxSizing: "border-box",
};

const titleStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  textAlign: "center",
  lineHeight: 1.45,
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const timeStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.8)",
  fontSize: 11,
  minWidth: 40,
  flex: "0 0 auto",
};

const pillBtnSmall: React.CSSProperties = {
  height: 36,
  padding: "0 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 12,
  border: "1px solid rgba(255,255,255,0.1)",
  flex: "0 0 auto",
  whiteSpace: "nowrap",
};

const productMainBtn: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 999,
  background: "#fff",
  color: "#000",
  fontWeight: 900,
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  flex: "0 0 auto",
};

const outerBtnStyle: React.CSSProperties = {
  height: 32,
  padding: "0 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 11,
  border: "1px solid rgba(255,255,255,0.1)",
  whiteSpace: "nowrap",
};