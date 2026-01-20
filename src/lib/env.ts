// ===== src/lib/env.ts =====
export const VIDEO_BASE_URL =
  process.env.NEXT_PUBLIC_VIDEO_BASE_URL?.replace(/\/$/, "") || "";

export function resolveVideoUrl(url: string) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (!VIDEO_BASE_URL) return url;
  return `${VIDEO_BASE_URL}/${url.replace(/^\//, "")}`;
}

export function resolvePosterUrl(poster?: string) {
  if (!poster) return undefined;
  if (poster.startsWith("http://") || poster.startsWith("https://")) return poster;
  if (!VIDEO_BASE_URL) return poster;
  return `${VIDEO_BASE_URL}/${poster.replace(/^\//, "")}`;
}
