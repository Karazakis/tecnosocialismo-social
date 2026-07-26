import type { VideoPreview } from "./social";

export const VIDEO_ORIGIN = process.env.VIDEO_ORIGIN ?? "https://video.tecnosocialismo.com";

export async function listPublicVideos(): Promise<VideoPreview[]> {
  try {
    const response = await fetch(`${VIDEO_ORIGIN}/api/videos`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload = (await response.json()) as { videos?: VideoPreview[] };
    return Array.isArray(payload.videos) ? payload.videos : [];
  } catch {
    return [];
  }
}

export async function findPublicVideo(id: string) {
  return (await listPublicVideos()).find((video) => video.id === id) ?? null;
}
