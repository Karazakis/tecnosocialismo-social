import { getSuiteUser } from "@/lib/auth";
import { countLikes, hasLike, readPost, setLike } from "@/lib/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSuiteUser(new Headers(request.headers));
  if (!user) return Response.json({ error: "Accedi per partecipare." }, { status: 401 });
  const { id } = await context.params;
  if (!(await readPost(id))) return Response.json({ error: "Contenuto non trovato." }, { status: 404 });
  const liked = await hasLike(id, user.id);
  await setLike(id, user.id, !liked);
  return Response.json({ liked: !liked, likeCount: await countLikes(id) });
}
