import { getSuiteUser } from "@/lib/auth";
import { countReposts, hasRepost, readPost, setRepost } from "@/lib/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSuiteUser(new Headers(request.headers));
  if (!user) return Response.json({ error: "Accedi per rilanciare." }, { status: 401 });
  const { id } = await context.params;
  if (!(await readPost(id))) return Response.json({ error: "Contenuto non trovato." }, { status: 404 });
  const reposted = await hasRepost(id, user.id);
  await setRepost(id, user.id, !reposted);
  return Response.json({ reposted: !reposted, repostCount: await countReposts(id) });
}
