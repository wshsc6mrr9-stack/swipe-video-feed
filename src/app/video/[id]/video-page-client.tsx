// src/app/video/[id]/video-page-client.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import VideoFeedNoSSR from "@/app/VideoFeedNoSSR";

export default function VideoPageClient() {
  const params = useParams() as { id?: string };
  const startId = String(params?.id ?? "").trim();

  return <VideoFeedNoSSR startId={startId} />;
}
