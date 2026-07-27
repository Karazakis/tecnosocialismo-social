import { getSuiteUser } from "@/lib/auth";
import { safeText } from "@/lib/social";
import { isFollowing, listPosts, setFollowing } from "@/lib/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSuiteUser(new Headers(request.headers));
  if (!user) return Response.json({ error: "Accedi per seguire una persona." }, { status: 401 });
  const { id } = await context.params;
  const authorId = safeText(decodeURIComponent(id), 180);
  if (!authorId || authorId === user.id) return Response.json({ error: "Operazione non disponibile." }, { status: 400 });
  const authorPost = (await listPosts(authorId))[0];
  if (!authorPost) return Response.json({ error: "Profilo non trovato." }, { status: 404 });
  const following = await isFollowing(user.id, authorId);
  await setFollowing(user.id, authorId, authorPost.authorName, !following);
  return Response.json({ following: !following, authorId });
}
