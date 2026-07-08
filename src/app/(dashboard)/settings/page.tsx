import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUsersAction } from "@/server/actions/agent-actions";
import { getLeadersAction } from "@/server/actions/accounting-actions";
import { SettingsClientPage } from "./settings-client-page";

export const metadata = {
  title: "Paramètres & Profil - AYLAN GROUP",
  description: "Gérer votre profil personnel, la sécurité, et les paramètres du portail.",
};

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  const role = user.role || "AGENT";

  let initialUsers: any[] = [];
  let leaders: any[] = [];

  // Only fetch administration data if the user is ADMIN
  if (role === "ADMIN") {
    const usersRes = await getUsersAction();
    const leadersRes = await getLeadersAction();

    if (usersRes.success && usersRes.users) {
      initialUsers = usersRes.users;
    }
    if (leadersRes.success && leadersRes.leaders) {
      leaders = leadersRes.leaders;
    }
  }

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role,
  };

  return (
    <SettingsClientPage
      initialUsers={initialUsers}
      leaders={leaders}
      currentUser={currentUser}
    />
  );
}
