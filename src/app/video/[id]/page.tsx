// src/app/video/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";

type VideoItem = {
  id: string;
  title: string;
  url: string;
  poster?: string;
  affUrl?: string;
  affLabel?: string;
  createdAt: number;
  genres?: string[];
  genre?: string;
};

export default function VideoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = useParams() as { id?: string };
  const id = String(params?.id ?? "");

  // ✅ Xカード用：/video/{id}?embed=1 だけは単体再生
  const isEmbed = useMemo(() => String(searchParams?.get("embed") ?? "") === "1", [searchParams]);

  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ 通常アクセスは “本番と同じフィード” に飛ばす（共有動画IDを渡す）
  //    embed=1 の時だけここをスキップして単体再生を表示する
  useEffect(() => {
    if (!id) return;
    if (isEmbed) return;

    // /?v={id} に飛ばす（フィード側が v を見てその動画から開始する想定）
    router.replace(`/?v=${encodeURIComponent(id)}`);
  }, [id, isEmbed, router]);

  // ✅ embed=1 の時だけ動画情報を取りに行って単体再生する
  useEffect(() => {
    if (!isEmbed) return; // 通常時はトップに飛ぶので不要
    let alive = true;

    (async () => {
      try {
        const r = await fetch("/api/videos", { cache: "no-store" });
        const j = await r.json().catch(() => null);
        const arr = Array.isArray(j?.items) ? (j.items as VideoItem[]) : [];
        if (!alive) return;
        setItems(arr);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isEmbed]);

  const video = useMemo(() => items.find((v) => String(v.id) === id), [items, id]);

  // ✅ embed=1 の時だけUI表示
  if (!isEmbed) {
    // リダイレクト中の一瞬だけ表示（白画面防止）
    return (
      <div style={{ padding: 24, color: "#fff", background: "#000", minHeight: "100vh" }}>
        <h1>Opening...</h1>
        <p>id: {id}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24, color: "#fff", background: "#000", minHeight: "100vh" }}>
        <h1>Loading...</h1>
        <p>id: {id}</p>
      </div>
    );
  }

  if (!id || !video) {
    return (
      <div style={{ padding: 24, color: "#fff", background: "#000", minHeight: "100vh" }}>
        <h1>NOT FOUND</h1>
        <p>id: {id}</p>
        <p>videos length: {items.length}</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <VideoPlayer video={video as any} isActive />
    </div>
  );
}
