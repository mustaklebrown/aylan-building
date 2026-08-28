import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { DashboardClientPage } from "./dashboard-client-page";

export const metadata = {
  title: "Tableau de Bord - AYLAN GROUP",
  description: "Rapports financiers, suivi des stocks, ventes et commissions.",
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
  const isEcommercant = role === "ECOMMERCANT";
  const isStockiste = role === "STOCKISTE";
  const isLeader = role === "LEADER";

  // Drivers go directly to deliveries page
  if (role === "DELIVERY") {
    redirect("/deliveries");
  }

  // Filters based on role
  let salesFilter: any = {};
  let prospectsFilter: any = {};
  let commissionsFilter: any = {};
  let productsFilter: any = {};

  if (isAgent || isEcommercant) {
    salesFilter = { agentId: user.id };
    prospectsFilter = { agentId: user.id };
    commissionsFilter = { agentId: user.id };
    productsFilter = { isActive: true };
  } else if (isStockiste) {
    salesFilter = { stockisteId: user.id };
    prospectsFilter = { agentId: user.id };
    commissionsFilter = { sale: { stockisteId: user.id } };
    productsFilter = { stockisteId: user.id };
  } else if (isLeader) {
    salesFilter = {
      OR: [
        { agent: { leaderId: user.id } },
        { leaderId: user.id },
      ],
    };
    prospectsFilter = { agent: { leaderId: user.id } };
    commissionsFilter = {
      OR: [
        { agentId: user.id },
        { agent: { leaderId: user.id } },
      ],
    };
    productsFilter = { isActive: true };
  }

  // Fetch sales
  const sales = await prisma.sale.findMany({
    where: salesFilter,
    orderBy: { date: "desc" },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      agent: { select: { id: true, name: true, email: true, role: true } },
      stockiste: { select: { id: true, name: true } },
      leader: { select: { id: true, name: true } },
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
          sellerRole: true,
          product: { select: { name: true } },
        },
      },
      agent: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  // Fetch agents / sellers (if ADMIN, ACCOUNTANT, LEADER, or STOCKISTE)
  let agents: any[] = [];
  if (!isAgent && !isEcommercant) {
    const agentWhere: any = isLeader
      ? { role: "AGENT", leaderId: user.id }
      : isStockiste
      ? { role: { in: ["AGENT", "ECOMMERCANT", "LEADER"] } }
      : { role: { in: ["AGENT", "ECOMMERCANT", "LEADER", "STOCKISTE"] } };

    agents = await prisma.user.findMany({
      where: agentWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  // Fetch products
  const products = await prisma.product.findMany({
    where: productsFilter,
    select: {
      id: true,
      name: true,
      sku: true,
      stockAvailable: true,
      alertThreshold: true,
      purchasePrice: true,
      salePrice: true,
      agentCommission: true,
      ecommercantCommission: true,
      leaderCommission: true,
      isActive: true,
      stockisteId: true,
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
