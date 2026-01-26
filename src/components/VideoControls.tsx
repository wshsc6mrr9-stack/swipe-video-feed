"use client";

import React from "react";

type Props = {
  isPlaying: boolean;
  muted: boolean;

  currentTime: number;
  duration: number;

  onTogglePlay: () => void;
  onToggleMute: () => void;

  onSeekTo: (t: number) => void;
  onSeekBy: (deltaSec: number) => void;

  className?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatTime(t: number) {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  );
}
function IconPause() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  );
}
function IconVolume() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a3.5 3.5 0 0 0-2.06-3.2v6.4A3.5 3.5 0 0 0 16.5 12z"
      />
      <path
        fill="currentColor"
        d="M14.44 3.6v2.2A7 7 0 0 1 21 12a7 7 0 0 1-6.56 6.2v2.2A9.2 9.2 0 0 0 23.2 12 9.2 9.2 0 0 0 14.44 3.6z"
      />
    </svg>
  );
}
function IconMute() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 10v4h4l5 4V6L7 10H3zm13.59 2 2.7 2.7-1.41 1.41L15.17 13.4l-2.7 2.7-1.41-1.41 2.7-2.7-2.7-2.7 1.41-1.41 2.7 2.7 2.7-2.7 1.41 1.41-2.7 2.7z"
      />
    </svg>
  );
}

function stop(e: any) {
  e.stopPropagation?.();
  e.nativeEvent?.stopImmediatePropagation?.();
}

function CircleButton(props: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  const { active, onClick, children, ariaLabel } = props;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "h-11 w-11 rounded-full grid place-items-center select-none",
        "border border-white/15 bg-white/10 text-white",
        "shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
        "backdrop-blur-md",
        "active:scale-[0.98] transition",
        active ? "bg-white text-black border-white" : "hover:bg-white/15",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PillButton(props: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "px-3 py-2 rounded-full text-sm font-medium",
        "border border-white/12 bg-white/10 text-white",
        "backdrop-blur-md",
        "shadow-[0_6px_24px_rgba(0,0,0,0.30)]",
        "hover:bg-white/15 active:scale-[0.99] transition",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

export default function VideoControls({
  isPlaying,
  muted,
  currentTime,
  duration,
  onTogglePlay,
  onToggleMute,
  onSeekTo,
  onSeekBy,
  className,
}: Props) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeTime = clamp(currentTime || 0, 0, safeDuration || Math.max(currentTime || 0, 0));
  const pct = safeDuration ? (safeTime / safeDuration) * 100 : 0;

  return (
    <div
      className={[
        "pointer-events-auto",
        "rounded-3xl border border-white/12 bg-black/35 backdrop-blur-xl",
        "shadow-[0_20px_80px_rgba(0,0,0,0.55)]",
        "p-3",
        className ?? "",
      ].join(" ")}
      data-ui="controls"
      data-no-swipe="1"
      onPointerDown={stop}
      onPointerMove={stop}
      onTouchStart={stop}
      onTouchMove={stop}
      onWheel={stop}
    >
      {/* 上段：スキップ */}
      <div className="flex items-center gap-2">
        <PillButton label="-10" onClick={() => onSeekBy(-10)} />
        <PillButton label="-5" onClick={() => onSeekBy(-5)} />
        <PillButton label="+5" onClick={() => onSeekBy(5)} />
        <PillButton label="+10" onClick={() => onSeekBy(10)} />
      </div>

      {/* 中段：シーク */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-white/70 mb-2">
          <span>{formatTime(safeTime)}</span>
          <span>{safeDuration ? formatTime(safeDuration) : "—:—"}</span>
        </div>

        <input
          type="range"
          min={0}
          max={safeDuration || 1}
          step={0.1}
          value={safeTime}
          onChange={(e) => onSeekTo(Number(e.target.value))}
          className="w-full accent-white"
          style={{
            // うっすら“進捗”が見えるように
            background: `linear-gradient(to right, rgba(255,255,255,0.9) ${pct}%, rgba(255,255,255,0.18) ${pct}%)`,
            height: 6,
            borderRadius: 999,
          }}
        />
      </div>

      {/* 下段：再生/ミュート */}
      <div className="mt-3 flex items-center justify-between">
        <CircleButton
          ariaLabel={isPlaying ? "停止" : "再生"}
          onClick={onTogglePlay}
          active={false}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </CircleButton>

        <div className="text-xs text-white/60 select-none">
          Swipe Video Feed
        </div>

        <CircleButton
          ariaLabel={muted ? "ミュート解除" : "ミュート"}
          onClick={onToggleMute}
          active={muted}
        >
          {muted ? <IconMute /> : <IconVolume />}
        </CircleButton>
      </div>
    </div>
  );
}
