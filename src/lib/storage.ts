// ===== src/lib/storage.ts =====
import { VideoMeta } from "./types";

export const CUSTOM_VIDEOS_UPDATED_EVENT = "customVideosUpdated";

export function notifyCustomVideosUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CUSTOM_VIDEOS_UPDATED_EVENT));
}

const LS_CUSTOM_VIDEOS = "customVideos:v1";
const LS_LIKES = "likes:v1";
const LS_SAVES = "saves:v1";

export function loadCustomVideos(): VideoMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_CUSTOM_VIDEOS);
    return raw ? (JSON.parse(raw) as VideoMeta[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomVideo(v: VideoMeta) {
  if (typeof window === "undefined") return;
  const list = loadCustomVideos();
  const next = [v, ...list.filter((x) => x.id !== v.id)];
  localStorage.setItem(LS_CUSTOM_VIDEOS, JSON.stringify(next));
}

export function loadLikes(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_LIKES);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function toggleLike(id: string): boolean {
  const likes = loadLikes();
  const next = !likes[id];
  likes[id] = next;
  localStorage.setItem(LS_LIKES, JSON.stringify(likes));
  return next;
}

export function loadSaves(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_SAVES);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function toggleSave(id: string): boolean {
  const saves = loadSaves();
  const next = !saves[id];
  saves[id] = next;
  localStorage.setItem(LS_SAVES, JSON.stringify(saves));
  return next;
}
