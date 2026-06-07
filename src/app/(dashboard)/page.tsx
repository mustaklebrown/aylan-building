import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { DashboardClientPage } from "./dashboard-client-page";

export const metadata = {
  title: "Tableau de Bord - AYLAN GROUP",
  description: "Rapports financiers, suivi des stocks et prospects.",
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  const role = user.role || "AGENT";
  const isAgent = role === "AGENT";

  // Filters based on role
  const salesFilter = isAgent ? { agentId: user.id } : {};
  const prospectsFilter = isAgent ? { agentId: user.id } : {};
  const commissionsFilter = isAgent ? { agentId: user.id } : {};

  // Fetch sales
  const sales = await prisma.sale.findMany({
    where: salesFilter,
    orderBy: { date: "desc" },
    include: {
      product: { select: { name: true } },
      agent: { select: { id: true, name: true, email: true } },
    },
  });

  // Fetch prospects
  const prospects = await prisma.prospect.findMany({
    where: prospectsFilter,
    orderBy: { createdAt: "desc" },
    include: {
      agent: { select: { id: true, name: true, email: true } },
    },
  });

  // Fetch commissions
  const commissions = await prisma.commission.findMany({
    where: commissionsFilter,
    orderBy: { date: "desc" },
    include: {
      sale: {
        select: {
          customerName: true,
          quantity: true,
          price: true,
          product: { select: { name: true } },
        },
      },
      agent: { select: { id: true, name: true, email: true } },
    },
  });

  // Fetch agents (if ADMIN or ACCOUNTANT)
  const agents = !isAgent
    ? await prisma.user.findMany({
        where: { role: "AGENT" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      })
    : [];

  // Fetch products for stock alerts
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      stockAvailable: true,
      alertThreshold: true,
    },
  });

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role,
  };

  return (
    <DashboardClientPage
      user={currentUser}
      sales={sales}
      prospects={prospects}
      commissions={commissions}
      agents={agents}
      products={products}
    />
  );
}
