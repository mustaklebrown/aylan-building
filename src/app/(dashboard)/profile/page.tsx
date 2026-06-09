import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileClientPage } from "@/app/(dashboard)/profile/profile-client-page";

export const metadata = {
  title: "Mon Profil - AYLAN GROUP",
  description: "Gérer vos informations de profil et modifier votre mot de passe.",
};

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role ?? "AGENT",
  };

  return <ProfileClientPage user={user} />;
}
