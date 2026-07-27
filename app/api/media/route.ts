import { put } from "@vercel/blob";
import { getSuiteUser } from "@/lib/auth";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Archivio non configurato." }, { status: 503 });
  const user = await getSuiteUser(new Headers(request.headers));
  if (!user) return Response.json({ error: "Accedi per caricare immagini." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Scegli un’immagine." }, { status: 400 });
  if (!ACCEPTED_TYPES.has(file.type)) return Response.json({ error: "Formato non supportato. Usa JPG, PNG, WebP o GIF." }, { status: 415 });
  if (file.size > MAX_IMAGE_BYTES) return Response.json({ error: "L’immagine supera gli 8 MB." }, { status: 413 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-90) || "immagine";
  const owner = user.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90);
  const blob = await put(`social-media/${owner}/${crypto.randomUUID()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
    cacheControlMaxAge: 31536000,
  });
  return Response.json({ url: blob.url }, { status: 201 });
}
