// src/app/video/[id]/video-page-client.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import VideoFeedNoSSR from "@/app/VideoFeedNoSSR";

type Props = {
  id?: string; // ✅ あってもなくてもOK（page.tsx から渡されなくてもエラーにしない）
};

export default function VideoPageClient(props: Props) {
  const params = useParams() as { id?: string };

  // ✅ props.id が来てたらそれ優先、無ければURL paramsから取る
  const startId = String(props?.id ?? params?.id ?? "").trim();

  return <VideoFeedNoSSR startId={startId} />;
}
