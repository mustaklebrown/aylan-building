"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

async function checkAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Non authentifié");
  }

  return session.user;
}

export async function getAccountingAction() {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  // Only ADMIN, ACCOUNTANT, and LEADER can access accounting
  if (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "LEADER") {
    return { success: false, error: "Non autorisé" };
  }

  try {
    // 1. Fetch all leaders
    const allLeaders = await prisma.user.findMany({
      where: { role: "LEADER" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // If LEADER, only show their own data
    const leaders = role === "LEADER"
      ? allLeaders.filter((l) => l.id === user.id)
      : allLeaders;

    const leaderIds = leaders.map((l) => l.id);

    // 2. Fetch all validated sales with product info
    const validatedStatuses = ["CONFIRMED", "SHIPPED", "DELIVERED"];

    const sales = await prisma.sale.findMany({
      where: {
        status: { in: validatedStatuses },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            purchasePrice: true,
            salePrice: true,
            agentCommission: true,
            isCommon: true,
            leaderId: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            leaderId: true,
          },
        },
      },
    });

    // 3. Separate into common and specific product sales
    const commonSales = sales.filter((s) => s.product.isCommon);
    const specificSales = sales.filter((s) => !s.product.isCommon && s.product.leaderId);

    // 4. Calculate gains
    const calculateGain = (sale: typeof sales[0]) => {
      const revenue = sale.price * sale.quantity;
      const cost = sale.product.purchasePrice * sale.quantity;
      const commission = sale.product.agentCommission * sale.quantity;
      return revenue - cost - commission;
    };

    // Total gains from common products
    const totalCommonGain = commonSales.reduce((sum, s) => sum + calculateGain(s), 0);
    const totalCommonRevenue = commonSales.reduce((sum, s) => sum + s.price * s.quantity, 0);

    // Share per leader for common products (equal split)
    const activeLeaderCount = leaders.length || 1;
    const commonSharePerLeader = totalCommonGain / activeLeaderCount;

    // Gains per leader from specific products
    const leaderSpecificGains: Record<string, number> = {};
    const leaderSpecificRevenues: Record<string, number> = {};
    for (const sale of specificSales) {
      const lid = sale.product.leaderId!;
      if (!leaderSpecificGains[lid]) {
        leaderSpecificGains[lid] = 0;
        leaderSpecificRevenues[lid] = 0;
      }
      leaderSpecificGains[lid] += calculateGain(sale);
      leaderSpecificRevenues[lid] += sale.price * sale.quantity;
    }

    // 5. Build leader summary
    const leaderSummaries = leaders.map((leader) => {
      const specificGain = leaderSpecificGains[leader.id] || 0;
      const specificRevenue = leaderSpecificRevenues[leader.id] || 0;
      const totalGain = commonSharePerLeader + specificGain;

      // Count agents for this leader
      const agentSales = sales.filter((s) => s.agent.leaderId === leader.id);
      const agentCount = new Set(agentSales.map((s) => s.agent.id)).size;

      return {
        id: leader.id,
        name: leader.name,
        email: leader.email,
        agentCount,
        commonShare: commonSharePerLeader,
        specificGain,
        specificRevenue,
        totalGain,
      };
    });

    // 6. Overall totals
    const totalSpecificGain = Object.values(leaderSpecificGains).reduce((sum, g) => sum + g, 0);
    const totalGain = totalCommonGain + totalSpecificGain;
    const totalRevenue = sales.reduce((sum, s) => sum + s.price * s.quantity, 0);
    const totalSalesCount = sales.length;

    // 7. Format sales detail
    const salesDetail = sales.map((s) => ({
      id: s.id,
      date: s.date,
      productName: s.product.name,
      isCommon: s.product.isCommon,
      leaderName: s.product.leaderId
        ? leaders.find((l) => l.id === s.product.leaderId)?.name || "Leader inconnu"
        : "Commun",
      agentName: s.agent.name,
      customerName: s.customerName,
      quantity: s.quantity,
      revenue: s.price * s.quantity,
      cost: s.product.purchasePrice * s.quantity,
      commission: s.product.agentCommission * s.quantity,
      gain: calculateGain(s),
      status: s.status,
    }));

    return {
      success: true,
      data: {
        leaders: leaderSummaries,
        totalCommonGain,
        totalCommonRevenue,
        commonSharePerLeader,
        totalSpecificGain,
        totalGain,
        totalRevenue,
        totalSalesCount,
        leaderCount: leaders.length,
        salesDetail,
      },
    };
  } catch (error: any) {
    console.error("Error getting accounting data:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all leaders for dropdowns (admin/accountant only)
 */
export async function getLeadersAction() {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return { success: false, error: "Non autorisé" };
  }

  try {
    const leaders = await prisma.user.findMany({
      where: { role: "LEADER" },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, leaders };
  } catch (error: any) {
    console.error("Error fetching leaders:", error);
    return { success: false, error: error.message };
  }
}
