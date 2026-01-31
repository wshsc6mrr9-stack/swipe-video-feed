// src/app/video/[id]/page.tsx
import AgeGateGuard from "@/components/AgeGateGuard";
import VideoPageClient from "./video-page-client";

export default async function Page() {
  return (
    <AgeGateGuard>
      <VideoPageClient />
    </AgeGateGuard>
  );
}
