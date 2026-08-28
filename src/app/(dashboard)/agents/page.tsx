import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAgentsAction } from "@/server/actions/agent-actions";
import { AgentsClientPage } from "./agents-client-page";

export const metadata = {
  title: "Gestion des Téléconseillers - AYLAN GROUP",
  description: "Liste et suivi des KPI de l'équipe commerciale.",
};

export default async function AgentsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  
  // Only ADMIN, ACCOUNTANT, LEADER, and STOCKISTE can view agents/sellers
  const role = user.role || "AGENT";
  if (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "LEADER" && role !== "STOCKISTE") {
    redirect("/unauthorized");
  }

  // Fetch agents data
  const res = await getAgentsAction();
  
  if (!res.success || !res.agents) {
    throw new Error(res.error || "Erreur lors de la récupération des agents.");
  }

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role,
  };

  return (
    <AgentsClientPage
      initialAgents={res.agents}
      currentUser={currentUser}
    />
  );
}
