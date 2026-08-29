import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSalesAction } from "@/server/actions/sale-actions";
import { SalesClientPage } from "./sales-client-page";

export const metadata = {
  title: "Suivi des Ventes - AYLAN GROUP",
  description: "Enregistrement des ventes et suivi des expéditions de colis.",
};

export default async function SalesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  const role = user.role || "AGENT";

  // Fetch sales list
  const res = await getSalesAction();

  if (!res.success || !res.sales) {
    throw new Error(res.error || "Erreur lors de la récupération des ventes.");
  }

  // Fetch active products list for the registration dropdown
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      salePrice: true,
      stockAvailable: true,
      agentCommission: true,
      ecommercantCommission: true,
      leaderCommission: true,
    },
  });

  // Fetch active agents list for registration assignment (only Admin/Accountant use this)
  const agents = await prisma.user.findMany({
    where: { role: { in: ["AGENT", "ECOMMERCANT", "LEADER"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  // Fetch prospects (to link sales to prospects for conversion rate)
  const prospects = await prisma.prospect.findMany({
    where: {
      status: { notIn: ["CLIENT", "LOST", "CONFIRMED"] },
      ...(role === "AGENT" ? { agentId: user.id } : {}),
    },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      agentId: true,
    },
  });

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role,
  };

  return (
    <SalesClientPage
      initialSales={res.sales}
      products={products}
      agents={agents}
      prospects={prospects}
      currentUser={currentUser}
    />
  );
}
