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
    // 1. Fetch leaders and validated sales in parallel
    const validatedStatuses = ["CONFIRMED", "SHIPPED", "DELIVERED"];

    const [allLeaders, sales] = await Promise.all([
      prisma.user.findMany({
        where: { role: "LEADER" },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.sale.findMany({
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
              ecommercantCommission: true,
              leaderCommission: true,
              isCommon: true,
              leaderId: true,
            },
          },
          agent: {
            select: {
              id: true,
              name: true,
              role: true,
              leaderId: true,
            },
          },
        },
      }),
    ]);

    // If LEADER, only show their own summary card while maintaining company-wide split
    const leaders = role === "LEADER"
      ? allLeaders.filter((l) => l.id === user.id)
      : allLeaders;

    // 2. Separate into common and specific product sales
    const commonSales = sales.filter((s) => s.product.isCommon);
    const specificSales = sales.filter((s) => !s.product.isCommon && s.product.leaderId);

    // 3. Calculate gains with accurate commission deductions
    const getSaleCommission = (sale: (typeof sales)[0]) => {
      const sellerComm =
        sale.sellerCommission > 0
          ? sale.sellerCommission
          : sale.sellerRole === "ECOMMERCANT"
          ? (sale.product.ecommercantCommission || 0) * sale.quantity
          : (sale.product.agentCommission || 0) * sale.quantity;
      const leaderComm = sale.leaderCommission > 0 ? sale.leaderCommission : 0;
      return sellerComm + leaderComm;
    };

    const calculateGain = (sale: (typeof sales)[0]) => {
      const revenue = sale.price * sale.quantity;
      const cost = sale.product.purchasePrice * sale.quantity;
      const commission = getSaleCommission(sale);
      return revenue - cost - commission;
    };

    // Total gains from common products
    const totalCommonGain = commonSales.reduce((sum, s) => sum + calculateGain(s), 0);
    const totalCommonRevenue = commonSales.reduce((sum, s) => sum + s.price * s.quantity, 0);

    // Share per leader for common products (equal split across all active leaders of the company)
    const companyLeaderCount = allLeaders.length || 1;
    const commonSharePerLeader = allLeaders.length > 0 ? totalCommonGain / companyLeaderCount : 0;

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

    // 4. Build leader summary
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

    // 5. Overall totals
    const totalSpecificGain = Object.values(leaderSpecificGains).reduce((sum, g) => sum + g, 0);
    const totalGain = totalCommonGain + totalSpecificGain;
    const totalRevenue = sales.reduce((sum, s) => sum + s.price * s.quantity, 0);
    const totalSalesCount = sales.length;

    // 6. Format sales detail
    const salesDetail = sales.map((s) => ({
      id: s.id,
      date: s.date,
      productName: s.product.name,
      isCommon: s.product.isCommon,
      leaderName: s.product.leaderId
        ? allLeaders.find((l) => l.id === s.product.leaderId)?.name || "Leader inconnu"
        : "Commun",
      agentName: s.agent.name,
      customerName: s.customerName,
      quantity: s.quantity,
      revenue: s.price * s.quantity,
      cost: s.product.purchasePrice * s.quantity,
      commission: getSaleCommission(s),
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
        leaderCount: allLeaders.length,
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
