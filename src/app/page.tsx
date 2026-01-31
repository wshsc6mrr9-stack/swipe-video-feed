import AgeGateGuard from "@/components/AgeGateGuard";
import VideoFeedNoSSR from "./VideoFeedNoSSR";

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function HomePage({ searchParams }: Props) {
  const v = searchParams?.v;
  const startId = Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");

  return (
    <AgeGateGuard>
      <VideoFeedNoSSR startId={startId || undefined} />
    </AgeGateGuard>
  );
}
