import { headers } from "next/headers";

const AUTH_ORIGIN = process.env.AUTH_ORIGIN ?? "https://login.tecnosocialismo.com";

export type SuiteUser = { id: string; name: string; email: string };
type SessionResponse = { user?: { id?: string; name?: string | null; email?: string } };

export async function getSuiteUser(requestHeaders?: Headers): Promise<SuiteUser | null> {
  if (process.env.SOCIAL_INTERFACE_PREVIEW === "true") {
    return { id: "social-preview", name: "Anteprima", email: "anteprima@tecnosocialismo.com" };
  }
  const cookie = (requestHeaders ?? (await headers())).get("cookie");
  if (!cookie) return null;
  try {
    const response = await fetch(`${AUTH_ORIGIN}/api/auth/get-session`, { headers: { cookie }, cache: "no-store" });
    if (!response.ok) return null;
    const session = (await response.json()) as SessionResponse | null;
    if (!session?.user?.id || !session.user.email) return null;
    return {
      id: session.user.id,
      name: session.user.name || session.user.email.split("@")[0] || "Persona",
      email: session.user.email,
    };
  } catch {
    return null;
  }
}
