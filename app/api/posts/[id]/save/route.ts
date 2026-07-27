import { getSuiteUser } from "@/lib/auth";
import { hasSaved, readPost, setSaved } from "@/lib/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSuiteUser(new Headers(request.headers));
  if (!user) return Response.json({ error: "Accedi per salvare." }, { status: 401 });
  const { id } = await context.params;
  if (!(await readPost(id))) return Response.json({ error: "Contenuto non trovato." }, { status: 404 });
  const saved = await hasSaved(id, user.id);
  await setSaved(id, user.id, !saved);
  return Response.json({ saved: !saved });
}
