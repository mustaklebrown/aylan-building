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
  const isAgent = role === "AGENT";

  try {
    const commissions = await prisma.commission.findMany({
      where: isAgent ? { agentId: user.id } : {},
      orderBy: { date: "desc" },
      include: {
        agent: {
          select: {
            name: true,
            email: true,
          },
        },
        sale: {
          select: {
            id: true,
            customerName: true,
            price: true,
            quantity: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Calculate summaries
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
      agentName: c.agent.name,
      agentEmail: c.agent.email,
      agentId: c.agentId,
      saleId: c.saleId,
      customerName: c.sale.customerName,
      productName: c.sale.product.name,
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

    // Update commission status
    await prisma.commission.update({
      where: { id: commissionId },
      data: { status: "PAID" },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PAY_COMMISSION",
        entity: "commission",
        entityId: commissionId,
        details: `Paiement validé pour la commission de ${commission.amount} € due à l'agent ${commission.agent.name}`,
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
