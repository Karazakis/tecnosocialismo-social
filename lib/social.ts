export type VideoPreview = {
  id: string;
  ownerName: string;
  title: string;
  category: string;
  durationSeconds: number;
  viewCount: number;
  publishedAt: string;
  hasPoster: boolean;
};

export type StoredPost = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  videoId: string | null;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
};

export type PublicPost = StoredPost & { likedByViewer: boolean; video: VideoPreview | null };

export type StoredComment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type PublicComment = Pick<StoredComment, "id" | "authorId" | "authorName" | "body" | "createdAt">;

export function safeText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\0/g, "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

export function videoIdFrom(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return match?.[0].toLowerCase() ?? null;
}

export function publicComment(comment: StoredComment): PublicComment {
  return { id: comment.id, authorId: comment.authorId, authorName: comment.authorName, body: comment.body, createdAt: comment.createdAt };
}
