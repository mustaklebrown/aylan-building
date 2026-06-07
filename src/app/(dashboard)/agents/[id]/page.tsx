import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAgentDetailAction } from "@/server/actions/agent-actions";
import { AgentDetailClientPage } from "./agent-detail-client-page";

export const metadata = {
  title: "KPI Téléconseiller - AYLAN GROUP",
  description: "Détails de performance commerciale de l'agent.",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  const role = user.role || "AGENT";

  // Only ADMIN and ACCOUNTANT can view individual agent details
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    redirect("/unauthorized");
  }

  const { id } = await params;

  // Fetch agent detail stats
  const res = await getAgentDetailAction(id);

  if (!res.success || !res.agent) {
    redirect("/agents");
  }

  return (
    <AgentDetailClientPage
      agent={res.agent}
      stats={res.stats!}
      chartData={res.chartData!}
      recentProspects={res.recentProspects!}
      recentSales={res.recentSales!}
      recentCommissions={res.recentCommissions!}
    />
  );
}
