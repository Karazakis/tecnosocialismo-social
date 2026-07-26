import { getSuiteUser } from "@/lib/auth";
import { publicComment, safeText, type StoredComment } from "@/lib/social";
import { listComments, readPost, saveComment } from "@/lib/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!(await readPost(id))) return Response.json({ error: "Contenuto non trovato." }, { status: 404 });
  return Response.json({ comments: (await listComments(id)).map(publicComment) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSuiteUser(new Headers(request.headers));
  if (!user) return Response.json({ error: "Accedi per commentare." }, { status: 401 });
  const { id } = await context.params;
  if (!(await readPost(id))) return Response.json({ error: "Contenuto non trovato." }, { status: 404 });
  const payload = await request.json().catch(() => null) as { body?: unknown } | null;
  const body = safeText(payload?.body, 1200);
  if (!body) return Response.json({ error: "Il commento è vuoto." }, { status: 400 });
  const comment: StoredComment = { id: crypto.randomUUID(), postId: id, authorId: user.id, authorName: user.name, body, createdAt: new Date().toISOString() };
  await saveComment(comment);
  return Response.json({ comment: publicComment(comment), commentCount: (await listComments(id)).length }, { status: 201 });
}
