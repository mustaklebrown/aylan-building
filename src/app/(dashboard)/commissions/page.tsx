import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCommissionsAction } from "@/server/actions/commission-actions";
import { CommissionsClientPage } from "./commissions-client-page";

export const metadata = {
  title: "Registre des Commissions - AYLAN GROUP",
  description: "Suivi des commissions par commercial et validation des paiements comptables.",
};

export default async function CommissionsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Only ADMIN, ACCOUNTANT, LEADER and AGENT can see commissions (not Delivery)
  if (session.user.role === "DELIVERY_ASSISTANT") {
    redirect("/unauthorized");
  }

  const user = session.user;
  const role = user.role || "AGENT";

  // Fetch commissions data
  const res = await getCommissionsAction();

  if (!res.success || !res.commissions || !res.summary) {
    throw new Error(res.error || "Erreur lors de la récupération des commissions.");
  }

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role,
  };

  return (
    <CommissionsClientPage
      initialCommissions={res.commissions}
      currentUser={currentUser}
    />
  );
}
