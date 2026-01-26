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

export default function VideoPlayer({ video, isActive = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const src = (video.url ?? (video as any).src ?? "") as string;

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  const [muted, setMuted] = useState<boolean>(() => readMuted());

  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  // ✅ like
  const [likeCount, setLikeCount] = useState<number>(() =>
    Number(video.likeCount ?? 0)
  );
  const [liked, setLiked] = useState<boolean>(() =>
    readLikedSet().has(String(video.id))
  );

  // ✅ 省エネ参照
  const currentRef = useRef(0);
  const durationRef = useRef(0);
  const lastUiRef = useRef(0);
  const seekRef = useRef<HTMLInputElement | null>(null);

  const vAny = video as unknown as {
    affUrl?: string;
    affLabel?: string;
    affiliateUrl?: string;
    affiliateLabel?: string;
  };

  const affUrl = (vAny.affUrl ?? vAny.affiliateUrl) as string | undefined;

  const effectiveMuted = isActive ? muted : true;

  const sentPlayRef = useRef(false);

  useEffect(() => {
    sentPlayRef.current = false;
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

  // ✅ タブ非表示で止める
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
        if (isActive) {
          el.muted = effectiveMuted;
          el.play()
            .then(() => setPlaying(true))
            .catch(() => setPlaying(false));
        }
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isActive, effectiveMuted]);

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
        const hls = new Hls({
          lowLatencyMode: false,
          capLevelToPlayerSize: true,
          backBufferLength: 10,
          maxBufferLength: 20,
        });
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

  // active だけ再生 / inactive は停止
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.muted = effectiveMuted;

    if (!isActive) {
      try {
        el.pause();
      } catch {}
      setPlaying(false);
      try {
        el.currentTime = 0;
      } catch {}

      currentRef.current = 0;
      setCurrent(0);
      if (seekRef.current) seekRef.current.value = "0";
      return;
    }

    const play = async () => {
      try {
        await el.play();
        setPlaying(true);
        if (!sentPlayRef.current) {
          sentPlayRef.current = true;
          track(String(video.id), "play");
        }
      } catch {
        setPlaying(false);
      }
    };

    play();
  }, [isActive, effectiveMuted, video.id]);

  // events
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onLoaded = () => {
      const d = Number.isFinite(el.duration) ? el.duration : 0;
      durationRef.current = d;
      setDuration(d);
      setReady(true);

      if (seekRef.current) seekRef.current.max = String(Math.max(0, d || 0));
    };

    const onTime = () => {
      const t = el.currentTime || 0;
      currentRef.current = t;

      if (seekRef.current) seekRef.current.value = String(t);

      const now = performance.now();
      if (now - lastUiRef.current >= 250) {
        lastUiRef.current = now;
        setCurrent(t);
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("durationchange", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("durationchange", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

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
      try {
        await el.play();
        setPlaying(true);
        if (!sentPlayRef.current) {
          sentPlayRef.current = true;
          track(String(video.id), "play");
        }
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
    writeMuted(next);

    el.muted = isActive ? next : true;
  };

  const seekTo = (t: number) => {
    const el = videoRef.current;
    if (!el) return;
    const d = Number.isFinite(el.duration) ? el.duration : durationRef.current || 0;
    el.currentTime = clamp(t, 0, d || 0);
  };

  const skip = (sec: number) => {
    const el = videoRef.current;
    if (!el) return;
    const base = Number.isFinite(el.currentTime) ? el.currentTime : currentRef.current;
    seekTo(base + sec);
  };

  const titleText = useMemo(() => {
    return video.title || src || "";
  }, [video.title, src]);

  const showPR = !!affUrl;

  const muteIconSrc = effectiveMuted ? "/icons/volume_mute.png" : "/icons/volume_on.png";
  const muteIconAlt = effectiveMuted ? "ミュート解除" : "ミュート";

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

    const shareUrl = typeof location !== "undefined" ? location.href : "";
    const text = titleText || "Swipe Video Feed";

    try {
      if ((navigator as any)?.share) {
        await (navigator as any).share({ title: text, text, url: shareUrl });
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("リンクをコピーした");
    } catch {
      prompt("このリンクをコピーして共有してな", shareUrl);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "black",
        overflow: "hidden", // ✅ はみ出し物理的にカット
      }}
    >
      {/* PR を上中央 */}
      {showPR ? (
        <div
          style={{
            position: "absolute",
            top: 10,
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

      <video
        ref={videoRef}
        playsInline
        muted={effectiveMuted}
        preload="metadata"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain", // ✅ 枠内に収める
          objectPosition: "center",
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

      {/* ===== 操作UI ===== */}
      <div
        data-no-swipe="1"
        data-ui="controls"
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          zIndex: 20,
          pointerEvents: "auto",
        }}
        onPointerDown={stop}
        onClick={stop}
      >
        <div
          style={{
            borderRadius: 18,
            padding: 12,
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
            display: "grid",
            gap: 10,
          }}
        >
          {/* タイトル */}
          <div style={titleClamp}>{titleText}</div>

          {/* シーク */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              defaultValue={0}
              onPointerDown={stop}
              onClick={stop}
              onChange={(e) => seekTo(Number((e.target as HTMLInputElement).value))}
              style={{ width: "100%" }}
            />

            <span
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 12,
                minWidth: 42,
                textAlign: "right",
              }}
            >
              {formatTime(duration)}
            </span>
          </div>

          {/* 下段 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 10,
              minHeight: 52,
            }}
          >
            {/* 左：スキップ */}
            <div
              style={{
                justifySelf: "start",
                display: "grid",
                gridTemplateColumns: "repeat(4, auto)",
                gap: 10,
                alignItems: "center",
              }}
            >
              <button data-no-swipe="1" data-ui="controls" onPointerDown={stop} onClick={(e) => (stop(e), skip(-10))} style={pillBtnBig}>
                -10
              </button>
              <button data-no-swipe="1" data-ui="controls" onPointerDown={stop} onClick={(e) => (stop(e), skip(-5))} style={pillBtnBig}>
                -5
              </button>
              <button data-no-swipe="1" data-ui="controls" onPointerDown={stop} onClick={(e) => (stop(e), skip(5))} style={pillBtnBig}>
                +5
              </button>
              <button data-no-swipe="1" data-ui="controls" onPointerDown={stop} onClick={(e) => (stop(e), skip(10))} style={pillBtnBig}>
                +10
              </button>
            </div>

            {/* 中央 */}
            <div
              style={{
                justifySelf: "center",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                whiteSpace: "nowrap",
              }}
            >
              {affUrl ? (
                <a
                  data-no-swipe="1"
                  data-ui="controls"
                  onPointerDown={stop}
                  onClick={(e) => {
                    stop(e);
                    track(String(video.id), "aff_click");
                  }}
                  href={affUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={productRoundBtn}
                >
                  本編
                </a>
              ) : null}

              <button
                data-no-swipe="1"
                data-ui="controls"
                onPointerDown={stop}
                onClick={onToggleLike}
                style={{
                  ...miniBtn,
                  background: liked ? "#fff" : miniBtn.background,
                  color: liked ? "#000" : miniBtn.color,
                }}
                aria-label="いいね"
                title="いいね"
              >
                {liked ? "♥" : "♡"} {likeCount}
              </button>

              <button
                data-no-swipe="1"
                data-ui="controls"
                onPointerDown={stop}
                onClick={onShare}
                style={miniBtn}
                aria-label="共有"
                title="共有"
              >
                共有
              </button>
            </div>

            {/* 右：再生＆ミュート */}
            <div
              style={{
                justifySelf: "end",
                display: "flex",
                gap: 10,
                alignItems: "center",
                minWidth: 140,
              }}
            >
              <button
                data-no-swipe="1"
                data-ui="controls"
                onPointerDown={stop}
                onClick={(e) => (stop(e), togglePlay())}
                style={primaryBtnSmallBg}
              >
                {playing ? "停止" : "再生"}
              </button>

              <button
                data-no-swipe="1"
                data-ui="controls"
                onPointerDown={stop}
                onClick={(e) => (stop(e), toggleMute())}
                style={iconBtn}
                aria-label={muteIconAlt}
                title={muteIconAlt}
              >
                <img
                  src={muteIconSrc}
                  alt=""
                  draggable={false}
                  style={{
                    width: 99,
                    height: 66,
                    display: "block",
                    objectFit: "contain",
                  }}
                  onError={(ev) => {
                    (ev.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** タイトル：4行クランプ + 中央 */
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

/** スキップ */
const pillBtnBig: React.CSSProperties = {
  minWidth: 54,
  height: 44,
  padding: "0 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(255,255,255,0.16)",
  fontWeight: 900,
  fontSize: 13,
  lineHeight: 1,
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};

/** ✅ 再生：背景小さめ */
const primaryBtnSmallBg: React.CSSProperties = {
  height: 44,
  minWidth: 64,
  padding: "0 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)", // 少し薄く
  color: "rgba(255,255,255,0.98)",
  border: "1px solid rgba(255,255,255,0.16)",
  fontWeight: 900,
  fontSize: 13,
  lineHeight: 1,
  whiteSpace: "nowrap",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};

/** ミュート（画像） */
const iconBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 999,
  background: "rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.98)",
  border: "1px solid rgba(255,255,255,0.14)",
  fontWeight: 900,
  fontSize: 16,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};

/** ✅ 商品：もうちょい大きく */
const productRoundBtn: React.CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: 999,
  background: "#fff",
  color: "#000",
  textDecoration: "none",
  fontWeight: 900,
  fontSize: 15,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
  border: "1px solid rgba(0,0,0,0.08)",
};

/** ♡ / 共有 */
const miniBtn: React.CSSProperties = {
  height: 44,
  padding: "0 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(255,255,255,0.14)",
  fontWeight: 900,
  fontSize: 13,
  lineHeight: 1,
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};
