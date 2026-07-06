import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccountingAction } from "@/server/actions/accounting-actions";
import { AccountingClientPage } from "./accounting-client-page";

export const metadata = {
  title: "Comptabilité & Répartition - AYLAN GROUP",
  description: "Suivi des gains, répartition entre leaders et comptabilité globale.",
};

export default async function AccountingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  const role = user.role || "AGENT";

  // Only ADMIN, ACCOUNTANT, and LEADER can access accounting
  if (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "LEADER") {
    redirect("/unauthorized");
  }

  const res = await getAccountingAction();

  if (!res.success || !res.data) {
    throw new Error(res.error || "Erreur lors de la récupération des données comptables.");
  }

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role,
  };

  return (
    <AccountingClientPage
      data={res.data}
      currentUser={currentUser}
    />
  );
}
