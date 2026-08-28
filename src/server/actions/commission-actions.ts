"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

async function checkAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Non authentifié");
  }

  return session.user;
}

export async function getCommissionsAction() {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  // Build where clause based on role
  let whereClause: any = {};
  if (role === "AGENT" || role === "ECOMMERCANT") {
    whereClause = { agentId: user.id };
  } else if (role === "LEADER") {
    // Leaders see their own leader commissions + commissions of their team agents
    whereClause = {
      OR: [
        { agentId: user.id },
        { agent: { leaderId: user.id } },
      ],
    };
  } else if (role === "STOCKISTE") {
    // Stockistes see commissions associated with sales of their products
    whereClause = {
      sale: { stockisteId: user.id },
    };
  }
  // ADMIN and ACCOUNTANT see all

  try {
    const commissions = await prisma.commission.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      include: {
        agent: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
        sale: {
          select: {
            id: true,
            customerName: true,
            price: true,
            quantity: true,
            sellerRole: true,
            stockiste: {
              select: {
                name: true,
              },
            },
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const commissionsMonthList = commissions.filter(
      (c) => new Date(c.date) >= startOfMonth
    );
    const commissionsMonth = commissionsMonthList.reduce((sum, c) => sum + c.amount, 0);

    const commissionsPending = commissions
      .filter((c) => c.status === "PENDING")
      .reduce((sum, c) => sum + c.amount, 0);

    const commissionsPaid = commissions
      .filter((c) => c.status === "PAID")
      .reduce((sum, c) => sum + c.amount, 0);

    const formattedCommissions = commissions.map((c) => ({
      id: c.id,
      date: c.date,
      amount: c.amount,
      status: c.status,
      role: c.role || c.agent?.role || "AGENT",
      agentName: c.agent.name,
      agentEmail: c.agent.email,
      agentId: c.agentId,
      saleId: c.saleId,
      customerName: c.sale.customerName,
      productName: c.sale.product.name,
      sellerRole: c.sale.sellerRole || "AGENT",
      stockisteName: c.sale.stockiste?.name || null,
      saleTotal: c.sale.price * c.sale.quantity,
    }));

    return {
      success: true,
      commissions: formattedCommissions,
      summary: {
        commissionsMonth,
        commissionsPending,
        commissionsPaid,
        commissionsTotal: commissionsPending + commissionsPaid,
      },
    };
  } catch (error: any) {
    console.error("Error getting commissions:", error);
    return { success: false, error: error.message };
  }
}

export async function payCommissionAction(commissionId: string) {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return { success: false, error: "Non autorisé à valider le paiement des commissions." };
  }

  try {
    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { agent: true },
    });

    if (!commission) {
      return { success: false, error: "Commission non trouvée." };
    }

    if (commission.status === "PAID") {
      return { success: false, error: "Cette commission est déjà payée." };
    }

    await prisma.commission.update({
      where: { id: commissionId },
      data: { status: "PAID" },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PAY_COMMISSION",
        entity: "commission",
        entityId: commissionId,
        details: `Paiement validé pour la commission de ${commission.amount} KMF due à ${commission.agent.name} (${commission.role})`,
      },
    });

    revalidatePath("/commissions");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error paying commission:", error);
    return { success: false, error: error.message };
  }
}
