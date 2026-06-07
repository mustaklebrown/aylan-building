import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProspectsAction } from "@/server/actions/prospect-actions";
import { CRMClientPage } from "./crm-client-page";

export const metadata = {
  title: "CRM / Prospects - AYLAN GROUP",
  description: "Gérez vos contacts commerciaux et suivez l'avancement de chaque prospect.",
};

export default async function CRMPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Accountants don't have access to CRM
  if (session.user.role === "ACCOUNTANT") {
    redirect("/unauthorized");
  }

  const res = await getProspectsAction();

  return (
    <CRMClientPage
      initialProspects={res.success ? res.prospects! : []}
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role || "AGENT",
      }}
    />
  );
}
