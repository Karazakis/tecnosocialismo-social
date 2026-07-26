import { del, get, list, put } from "@vercel/blob";
import type { StoredComment, StoredPost } from "./social";

const POST_PREFIX = "social-posts/";
const COMMENT_PREFIX = "social-comments/";
const LIKE_PREFIX = "social-likes/";

export async function savePost(post: StoredPost) {
  await writeJson(`${POST_PREFIX}${post.id}.json`, post, false);
  return post;
}

export async function readPost(id: string): Promise<StoredPost | null> {
  if (!isUuid(id)) return null;
  return readJson<StoredPost>(`${POST_PREFIX}${id}.json`);
}

export async function listPosts(authorId?: string): Promise<StoredPost[]> {
  const result = await list({ prefix: POST_PREFIX, limit: 1000 });
  const records = await Promise.all(result.blobs.map((blob) => readJson<StoredPost>(blob.url)));
  return records
    .filter((post): post is StoredPost => Boolean(post) && (!authorId || post?.authorId === authorId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updatePost(id: string, mutate: (post: StoredPost) => StoredPost) {
  const current = await readPost(id);
  if (!current) return null;
  const updated = mutate({ ...current, updatedAt: new Date().toISOString() });
  await writeJson(`${POST_PREFIX}${id}.json`, updated, true);
  return updated;
}

export async function listComments(postId: string): Promise<StoredComment[]> {
  if (!isUuid(postId)) return [];
  const result = await list({ prefix: `${COMMENT_PREFIX}${postId}/`, limit: 1000 });
  const comments = await Promise.all(result.blobs.map((blob) => readJson<StoredComment>(blob.url)));
  return comments.filter((item): item is StoredComment => Boolean(item)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function saveComment(comment: StoredComment) {
  const time = comment.createdAt.replace(/[:.]/g, "-");
  await writeJson(`${COMMENT_PREFIX}${comment.postId}/${time}-${comment.id}.json`, comment, false);
  return comment;
}

export async function hasLike(postId: string, userId: string) {
  const result = await list({ prefix: `${LIKE_PREFIX}${postId}/${safeKey(userId)}.json`, limit: 1 });
  return result.blobs.length > 0;
}

export async function setLike(postId: string, userId: string, liked: boolean) {
  const pathname = `${LIKE_PREFIX}${postId}/${safeKey(userId)}.json`;
  if (liked) await writeJson(pathname, { postId, userId, createdAt: new Date().toISOString() }, true);
  else await del(pathname).catch(() => undefined);
}

async function writeJson(pathname: string, value: unknown, allowOverwrite: boolean) {
  await put(pathname, JSON.stringify(value), {
    access: "private", addRandomSuffix: false, allowOverwrite,
    contentType: "application/json; charset=utf-8", cacheControlMaxAge: 0,
  });
}

async function readJson<T>(urlOrPathname: string): Promise<T | null> {
  try {
    const result = await get(urlOrPathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return JSON.parse(await new Response(result.stream).text()) as T;
  } catch { return null; }
}

function safeKey(value: string) { return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180); }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
