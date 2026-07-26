import { getSuiteUser } from "@/lib/auth";
import { readPost, removePost } from "@/lib/store";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSuiteUser(new Headers(request.headers));
  if (!user) return Response.json({ error: "Accedi per eliminare il contenuto." }, { status: 401 });
  const { id } = await context.params;
  const post = await readPost(id);
  if (!post) return Response.json({ error: "Contenuto non trovato." }, { status: 404 });
  if (post.authorId !== user.id) return Response.json({ error: "Puoi eliminare solo i tuoi contenuti." }, { status: 403 });
  await removePost(id);
  return Response.json({ deleted: true });
}
