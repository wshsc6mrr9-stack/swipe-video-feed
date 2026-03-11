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
const DOUBLE_TAP_MS = 280;

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
  timeoutMs = 2000
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
  const primedRef = useRef(false);
  const startOffsetAppliedRef = useRef(false);
  const userSeekedRef = useRef(false);
  const leftTapAtRef = useRef(0);
  const rightTapAtRef = useRef(0);

  const rawSrc = (video.url ?? (video as any).src ?? "") as string;

  const [playing, setPlaying] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
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

  useEffect(() => {
    setPlaying(false);
    setCurrent(START_OFFSET_SEC);
    setDuration(Number((video as any).duration ?? 0));
    setLikeCount(Number(video.likeCount ?? 0));
    setLiked(readLikedSet().has(String(video.id)));
    setShowTapToUnmute(false);
    primedRef.current = false;
    startOffsetAppliedRef.current = false;
    userSeekedRef.current = false;
    leftTapAtRef.current = 0;
    rightTapAtRef.current = 0;
  }, [video.id, video.likeCount, (video as any).duration]);

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
    const details = hls?.levels?.[hls.currentLevel]?.details as any;
    if (Number.isFinite(details?.totalduration) && details.totalduration > 0) {
      candidates.push(details.totalduration);
    }

    return candidates.length ? Math.max(...candidates) : 0;
  }

  async function forceSeekToStartOffset(
    el: HTMLVideoElement,
    force = false
  ) {
    if (!force && (startOffsetAppliedRef.current || userSeekedRef.current)) {
      return;
    }

    if (el.readyState < 1) {
      await waitForEvent(el, "loadedmetadata", 2500);
    }

    const needsSeek = Math.abs(el.currentTime - START_OFFSET_SEC) > 0.35;
    if (!needsSeek) {
      startOffsetAppliedRef.current = true;
      return;
    }

    try {
      el.currentTime = START_OFFSET_SEC;
    } catch {}

    await waitForEvent(el, "seeked", 1200);

    if (Math.abs(el.currentTime - START_OFFSET_SEC) > 0.75) {
      try {
        el.currentTime = START_OFFSET_SEC;
      } catch {}
      await waitForEvent(el, "seeked", 1200);
    }

    setCurrent(el.currentTime);
    startOffsetAppliedRef.current = true;
  }

  async function playWithSafariFallback(
    el: HTMLVideoElement,
    wantsAudio: boolean
  ) {
    try {
      el.muted = !wantsAudio;
      await el.play();
      setPlaying(true);
      setVideoStarted(true);
      setCurrent(el.currentTime);

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
        setCurrent(el.currentTime);
        setMuted(true);
        setShowTapToUnmute(isActive);
        return true;
      } catch {
        setPlaying(false);
        return false;
      }
    }
  }

  async function primeAtStartOffset(el: HTMLVideoElement) {
    if (primedRef.current) return;

    el.muted = true;
    el.preload = "auto";

    if (el.readyState < 1) {
      await waitForEvent(el, "loadedmetadata", 2500);
    }

    await forceSeekToStartOffset(el, true);

    try {
      await el.play();
      await waitNextFrame();
      await waitNextFrame();
      el.pause();
    } catch {}

    primedRef.current = true;
    setVideoStarted(true);
    setCurrent(el.currentTime);
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

    primedRef.current = false;

    el.pause();
    el.removeAttribute("src");
    el.load();

    const syncDuration = () => {
      const next = getBestDuration(el);
      if (next > 0) {
        setDuration(next);
      }
    };

    const markReady = () => {
      setVideoStarted(true);
      syncDuration();
    };

    const onLoadedMetadata = () => syncDuration();
    const onDurationChange = () => syncDuration();
    const onLoadedData = () => markReady();
    const onCanPlay = () => markReady();
    const onProgress = () => syncDuration();
    const onSeeking = () => syncDuration();
    const onSeeked = () => {
      syncDuration();
      setCurrent(el.currentTime);
    };
    const onPlaying = () => {
      setPlaying(true);
      markReady();
    };
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrent(el.currentTime);
      syncDuration();
      if (el.currentTime > 0.1) {
        markReady();
      }
    };

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("loadeddata", onLoadedData);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("progress", onProgress);
    el.addEventListener("seeking", onSeeking);
    el.addEventListener("seeked", onSeeked);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);

    if (rawSrc.includes(".m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          startPosition: START_OFFSET_SEC,
          maxBufferLength: 10,
          maxMaxBufferLength: 20,
          backBufferLength: 0,
          enableWorker: true,
          lowLatencyMode: true,
        } as any);

        hlsRef.current = hls;
        hls.loadSource(rawSrc);
        hls.attachMedia(el);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          syncDuration();
        });

        hls.on(Hls.Events.LEVEL_LOADED, (_event, data: any) => {
          const total = Number(data?.details?.totalduration ?? 0);
          if (total > 0) {
            setDuration(total);
          } else {
            syncDuration();
          }
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          syncDuration();
        });
      } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = rawSrc;
        el.preload = "auto";
      } else {
        el.src = rawSrc;
        el.preload = "auto";
      }
    } else {
      el.src = rawSrc;
      el.preload = "auto";
    }

    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("loadeddata", onLoadedData);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("progress", onProgress);
      el.removeEventListener("seeking", onSeeking);
      el.removeEventListener("seeked", onSeeked);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.id, rawSrc]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;

    const run = async () => {
      if (isNeighbor) {
        try {
          await primeAtStartOffset(el);
          if (cancelled) return;
          el.pause();
          setPlaying(false);
        } catch {}
        return;
      }

      if (isActive) {
        try {
          if (!primedRef.current) {
            await primeAtStartOffset(el);
          }
        } catch {}

        if (cancelled) return;

        await playWithSafariFallback(el, !muted);
        return;
      }

      setShowTapToUnmute(false);
      el.pause();
      setPlaying(false);
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

  const hasDuration = Number.isFinite(duration) && duration > 0;
  const sliderMin = 0;
  const sliderMax = hasDuration ? duration : START_OFFSET_SEC;
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
        preload="auto"
        muted={!isActive || muted}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          position: "absolute",
          inset: 0,
          zIndex: 1,
          opacity: videoStarted ? 1 : 0.001,
          transition: "opacity 0.12s linear",
          background: "#000",
        }}
      />

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
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            marginBottom: 10,
            maxWidth: 560,
            margin: "0 auto 10px",
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
                if (!nextMuted) {
                  void playWithSafariFallback(el, true);
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

        <div style={panelStyle}>
          <div style={titleStyle}>{video.title || "Untitled"}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              style={{ width: "100%", accentColor: "#fff" }}
            />

            <span style={timeStyle}>{formatDurationOrUnknown(duration)}</span>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
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
  maxWidth: 560,
  margin: "0 auto",
  backdropFilter: "blur(15px)",
};

const titleStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  textAlign: "center",
};

const timeStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.8)",
  fontSize: 11,
  minWidth: 40,
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
};

const productMainBtn: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 999,
  background: "#fff",
  color: "#000",
  fontWeight: 900,
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
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
};