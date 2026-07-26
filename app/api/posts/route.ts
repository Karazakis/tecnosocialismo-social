import { getSuiteUser } from "@/lib/auth";
import { safeText, videoIdFrom, type PublicPost, type StoredPost } from "@/lib/social";
import { hasLike, listPosts, savePost } from "@/lib/store";
import { findPublicVideo, listPublicVideos } from "@/lib/video";

export async function GET(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ posts: [], configured: false });
  const url = new URL(request.url);
  const author = safeText(url.searchParams.get("author"), 180) || undefined;
  const user = await getSuiteUser(new Headers(request.headers));
  const [records, videos] = await Promise.all([listPosts(author), listPublicVideos()]);
  const videoMap = new Map(videos.map((video) => [video.id, video]));
  const posts: PublicPost[] = await Promise.all(records.slice(0, 100).map(async (post) => ({
    ...post,
    likedByViewer: user ? await hasLike(post.id, user.id) : false,
    video: post.videoId ? videoMap.get(post.videoId) ?? null : null,
  })));
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
