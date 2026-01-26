import VideoFeedNoSSR from "./VideoFeedNoSSR";
import AgeGateGuard from "@/components/AgeGateGuard";

export default function HomePage() {
  return (
    <AgeGateGuard>
      <VideoFeedNoSSR />
    </AgeGateGuard>
  );
}
