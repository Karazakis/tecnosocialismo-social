import { getSuiteUser } from "@/lib/auth";
import { imageUrlFrom, safeText, videoIdFrom, type PublicPerson, type PublicPost, type StoredPost } from "@/lib/social";
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
    imageUrl: post.imageUrl ?? null,
    likeCount: interactions.likeCounts.get(post.id) ?? 0,
    commentCount: interactions.commentCounts.get(post.id) ?? 0,
    repostCount: interactions.repostCounts.get(post.id) ?? 0,
    likedByViewer: interactions.likedPosts.has(post.id),
    savedByViewer: interactions.savedPosts.has(post.id),
    repostedByViewer: interactions.repostedPosts.has(post.id),
    followingAuthor: interactions.followingAuthors.has(post.authorId.replace(/[^a-zA-Z0-9_-]/g, "_")),
    video: post.videoId ? videoMap.get(post.videoId) ?? null : null,
  }));
  const personMap = new Map<string, PublicPerson>();
  for (const post of records) {
    const current = personMap.get(post.authorId);
    personMap.set(post.authorId, {
      id: post.authorId,
      name: post.authorName,
      postCount: (current?.postCount ?? 0) + 1,
      followerCount: interactions.followerCounts.get(post.authorId.replace(/[^a-zA-Z0-9_-]/g, "_")) ?? 0,
      following: interactions.followingAuthors.has(post.authorId.replace(/[^a-zA-Z0-9_-]/g, "_")),
      lastActive: current && current.lastActive > post.createdAt ? current.lastActive : post.createdAt,
    });
  }
  const people = [...personMap.values()].sort((a, b) => b.followerCount - a.followerCount || b.lastActive.localeCompare(a.lastActive));
  return Response.json({ posts, people, viewerId: user?.id ?? null, configured: true }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Archivio non configurato." }, { status: 503 });
  const user = await getSuiteUser(new Headers(request.headers));
  if (!user) return Response.json({ error: "Accedi per pubblicare." }, { status: 401 });
  const payload = await request.json().catch(() => null) as { body?: unknown; video?: unknown; imageUrl?: unknown } | null;
  const body = safeText(payload?.body, 3000);
  const videoId = videoIdFrom(payload?.video);
  const imageUrl = imageUrlFrom(payload?.imageUrl);
  if (typeof payload?.video === "string" && payload.video.trim() && !videoId) return Response.json({ error: "Incolla un link valido della piattaforma video." }, { status: 400 });
  if (typeof payload?.imageUrl === "string" && payload.imageUrl.trim() && !imageUrl) return Response.json({ error: "Immagine non valida." }, { status: 400 });
  if (!body && !videoId && !imageUrl) return Response.json({ error: "Scrivi qualcosa o aggiungi un contenuto." }, { status: 400 });
  if (videoId && !(await findPublicVideo(videoId))) return Response.json({ error: "Il video non è pubblico o non esiste." }, { status: 400 });
  const now = new Date().toISOString();
  const post: StoredPost = {
    id: crypto.randomUUID(), authorId: user.id, authorName: user.name,
    body, videoId, imageUrl, createdAt: now, updatedAt: now, likeCount: 0, commentCount: 0,
  };
  await savePost(post);
  const video = videoId ? await findPublicVideo(videoId) : null;
  return Response.json({ post: { ...post, likedByViewer: false, savedByViewer: false, repostedByViewer: false, followingAuthor: false, repostCount: 0, video } satisfies PublicPost }, { status: 201 });
}
