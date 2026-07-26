import { getSuiteUser } from "@/lib/auth";
import { safeText, videoIdFrom, type PublicPost, type StoredPost } from "@/lib/social";
import { interactionSummary, listPosts, savePost } from "@/lib/store";
import { findPublicVideo, listPublicVideos } from "@/lib/video";

export async function GET(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ posts: [], configured: false });
  const url = new URL(request.url);
  const author = safeText(url.searchParams.get("author"), 180) || undefined;
  const user = await getSuiteUser(new Headers(request.headers));
  const [records, videos, interactions] = await Promise.all([listPosts(author), listPublicVideos(), interactionSummary(user?.id)]);
  const videoMap = new Map(videos.map((video) => [video.id, video]));
  const posts: PublicPost[] = records.slice(0, 100).map((post) => ({
    ...post,
    likeCount: interactions.likeCounts.get(post.id) ?? 0,
    commentCount: interactions.commentCounts.get(post.id) ?? 0,
    likedByViewer: interactions.likedPosts.has(post.id),
    video: post.videoId ? videoMap.get(post.videoId) ?? null : null,
  }));
  return Response.json({ posts, configured: true }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Archivio non configurato." }, { status: 503 });
  const user = await getSuiteUser(new Headers(request.headers));
  if (!user) return Response.json({ error: "Accedi per pubblicare." }, { status: 401 });
  const payload = await request.json().catch(() => null) as { body?: unknown; video?: unknown } | null;
  const body = safeText(payload?.body, 3000);
  const videoId = videoIdFrom(payload?.video);
  if (typeof payload?.video === "string" && payload.video.trim() && !videoId) return Response.json({ error: "Incolla un link valido della piattaforma video." }, { status: 400 });
  if (!body && !videoId) return Response.json({ error: "Scrivi qualcosa o aggiungi un video." }, { status: 400 });
  if (videoId && !(await findPublicVideo(videoId))) return Response.json({ error: "Il video non è pubblico o non esiste." }, { status: 400 });
  const now = new Date().toISOString();
  const post: StoredPost = {
    id: crypto.randomUUID(), authorId: user.id, authorName: user.name,
    body, videoId, createdAt: now, updatedAt: now, likeCount: 0, commentCount: 0,
  };
  await savePost(post);
  const video = videoId ? await findPublicVideo(videoId) : null;
  return Response.json({ post: { ...post, likedByViewer: false, video } satisfies PublicPost }, { status: 201 });
}
