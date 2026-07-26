import { SocialApp } from "@/app/social-app";
import { getSuiteUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSuiteUser();
  return <SocialApp user={user} />;
}
