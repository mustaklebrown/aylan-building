"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// Helper to check if current user is admin or accountant
async function checkAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Non authentifié");
  }

  const role = session.user.role || "AGENT";
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    throw new Error("Non autorisé");
  }

  return session.user;
}

export async function getAgentsAction() {
  await checkAuth();

  try {
    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            prospects: true,
            sales: true,
          },
        },
        prospects: {
          select: {
            status: true,
          },
        },
        sales: {
          select: {
            price: true,
            quantity: true,
          },
        },
        commissions: {
          select: {
            amount: true,
          },
        },
      },
    });

    const formattedAgents = agents.map((agent) => {
      const prospectsCount = agent._count.prospects;
      const salesCount = agent._count.sales;
      const totalCommissions = agent.commissions.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      const totalRevenue = agent.sales.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Clients obtained are prospects with status "CLIENT" or "CONFIRMED"
      const clientsCount = agent.prospects.filter(
        (p) => p.status === "CLIENT" || p.status === "CONFIRMED"
      ).length;

      const conversionRate =
        prospectsCount > 0 ? (clientsCount / prospectsCount) * 100 : 0;

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        createdAt: agent.createdAt,
        prospectsCount,
        salesCount,
        totalCommissions,
        totalRevenue,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
      };
    });

    return { success: true, agents: formattedAgents };
  } catch (error: any) {
    console.error("Error fetching agents:", error);
    return { success: false, error: error.message };
  }
}

export async function getAgentDetailAction(agentId: string) {
  await checkAuth();

  try {
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      include: {
        prospects: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        sales: {
          orderBy: { date: "desc" },
          take: 10,
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        commissions: {
          orderBy: { date: "desc" },
          take: 10,
          include: {
            sale: {
              select: {
                customerName: true,
              },
            },
          },
        },
      },
    });

    if (!agent) {
      return { success: false, error: "Agent non trouvé" };
    }

    // Overall stats
    const totalProspects = await prisma.prospect.count({ where: { agentId } });
    const contactedProspects = await prisma.prospect.count({
      where: {
        agentId,
        status: { not: "NEW" },
      },
    });
    const clientsCount = await prisma.prospect.count({
      where: {
        agentId,
        status: { in: ["CLIENT", "CONFIRMED"] },
      },
    });
    const totalSales = await prisma.sale.count({ where: { agentId } });

    const revenueResult = await prisma.sale.aggregate({
      where: { agentId },
      _sum: {
        price: true, // Wait, since quantity might be > 1, we should fetch sales and compute or aggregate
      },
    });

    // Compute revenue safely
    const salesForRevenue = await prisma.sale.findMany({
      where: { agentId },
      select: { price: true, quantity: true },
    });
    const totalRevenue = salesForRevenue.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const commissionResult = await prisma.commission.aggregate({
      where: { agentId },
      _sum: {
        amount: true,
      },
    });
    const totalCommission = commissionResult._sum.amount || 0;

    const conversionRate =
      totalProspects > 0 ? (clientsCount / totalProspects) * 100 : 0;

    // Monthly data for past 6 months for chart
    const monthlyStats = [];
    const months = ["Janv.", "Févr.", "Mars", "Avril", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      
      const startOfMonth = new Date(year, monthIndex, 1);
      const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

      // Get monthly sales
      const monthlySalesList = await prisma.sale.findMany({
        where: {
          agentId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: { price: true, quantity: true },
      });
      const mRevenue = monthlySalesList.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Get monthly commissions
      const mCommResult = await prisma.commission.aggregate({
        where: {
          agentId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { amount: true },
      });
      const mCommissions = mCommResult._sum.amount || 0;

      monthlyStats.push({
        name: months[monthIndex],
        ventes: mRevenue,
        commissions: mCommissions,
      });
    }

    return {
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        createdAt: agent.createdAt,
      },
      stats: {
        totalProspects,
        contactedProspects,
        clientsCount,
        totalSales,
        totalRevenue,
        totalCommission,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
      },
      chartData: monthlyStats,
      recentProspects: agent.prospects,
      recentSales: agent.sales.map((sale) => ({
        id: sale.id,
        date: sale.date,
        customerName: sale.customerName,
        productName: sale.product.name,
        quantity: sale.quantity,
        total: sale.price * sale.quantity,
        status: sale.status,
      })),
      recentCommissions: agent.commissions.map((comm) => ({
        id: comm.id,
        date: comm.date,
        amount: comm.amount,
        status: comm.status,
        customerName: comm.sale.customerName,
      })),
    };
  } catch (error: any) {
    console.error("Error fetching agent details:", error);
    return { success: false, error: error.message };
  }
}

export async function createAgentAction(data: {
  name: string;
  email: string;
  password?: string;
}) {
  await checkAuth();

  const { name, email } = data;

  // Generate random 12-character alphanumeric/symbol password
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  let generatedPassword = "";
  for (let i = 0; i < 12; i++) {
    generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const passwordToUse = data.password && data.password.trim() !== "" ? data.password : generatedPassword;

  try {
    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { email },
    });

    if (existing) {
      return { success: false, error: "Un utilisateur avec cet email existe déjà." };
    }

    // Create via Better Auth API
    const created = await auth.api.signUpEmail({
      body: {
        email,
        password: passwordToUse,
        name,
      },
      headers: await headers(),
    });

    if (created && created.user) {
      // Force role to AGENT in DB
      await prisma.user.update({
        where: { id: created.user.id },
        data: { role: "AGENT" },
      });

      // Audit Log
      const currentUser = await auth.api.getSession({
        headers: await headers(),
      });
      if (currentUser?.user) {
        await prisma.auditLog.create({
          data: {
            userId: currentUser.user.id,
            action: "CREATE_AGENT",
            entity: "user",
            entityId: created.user.id,
            details: `Création de l'agent ${name} (${email})`,
          },
        });
      }

      revalidatePath("/agents");
      return { success: true, agentId: created.user.id, generatedPassword: passwordToUse };
    }

    return { success: false, error: "Erreur lors de la création du compte." };
  } catch (error: any) {
    console.error("Error creating agent:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAgentAction(
  agentId: string,
  data: {
    name: string;
    email: string;
    role: string;
  }
) {
  await checkAuth();

  const { name, email, role } = data;

  try {
    // Verify email doesn't conflict with another user
    const conflict = await prisma.user.findFirst({
      where: {
        email,
        id: { not: agentId },
      },
    });

    if (conflict) {
      return { success: false, error: "Cet email est déjà utilisé par un autre utilisateur." };
    }

    const updated = await prisma.user.update({
      where: { id: agentId },
      data: {
        name,
        email,
        role,
      },
    });

    // Audit Log
    const currentUser = await auth.api.getSession({
      headers: await headers(),
    });
    if (currentUser?.user) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.user.id,
          action: "UPDATE_AGENT",
          entity: "user",
          entityId: agentId,
          details: `Mise à jour des informations de l'agent : ${name} (${email}, rôle: ${role})`,
        },
      });
    }

    revalidatePath("/agents");
    revalidatePath(`/agents/${agentId}`);
    return { success: true, agent: updated };
  } catch (error: any) {
    console.error("Error updating agent:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAgentAction(agentId: string) {
  const currentUser = await checkAuth();

  if (currentUser.id === agentId) {
    return { success: false, error: "Vous ne pouvez pas vous supprimer vous-même." };
  }

  try {
    // Check if agent has prospects, sales, or commissions
    const prospectsCount = await prisma.prospect.count({ where: { agentId } });
    const salesCount = await prisma.sale.count({ where: { agentId } });
    const commissionsCount = await prisma.commission.count({ where: { agentId } });

    if (prospectsCount > 0 || salesCount > 0 || commissionsCount > 0) {
      return {
        success: false,
        error:
          "Impossible de supprimer cet agent car il possède des données commerciales actives (prospects, ventes ou commissions). Vous pouvez à la place réaffecter ses prospects ou modifier son compte.",
      };
    }

    // Delete associated sessions and accounts first due to cascade, then delete user
    await prisma.session.deleteMany({ where: { userId: agentId } });
    await prisma.account.deleteMany({ where: { userId: agentId } });
    await prisma.user.delete({ where: { id: agentId } });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: "DELETE_AGENT",
        entity: "user",
        entityId: agentId,
        details: `Suppression de l'utilisateur ${agentId}`,
      },
    });

    revalidatePath("/agents");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting agent:", error);
    return { success: false, error: error.message };
  }
}

export async function createProspectAction(data: {
  fullName: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  source?: string;
  interestedProduct?: string;
  comments?: string;
  status?: string;
  agentId: string;
}) {
  await checkAuth();

  const {
    fullName,
    phone,
    whatsapp,
    address,
    city,
    source,
    interestedProduct,
    comments,
    status = "NEW",
    agentId,
  } = data;

  if (!fullName.trim()) {
    return { success: false, error: "Le nom complet est obligatoire." };
  }

  try {
    // Verify agent exists
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent) {
      return { success: false, error: "Agent non trouvé." };
    }

    const prospect = await prisma.prospect.create({
      data: {
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        source: source?.trim() || null,
        interestedProduct: interestedProduct?.trim() || null,
        comments: comments?.trim() || null,
        status,
        agentId,
      },
    });

    // Audit Log
    const currentUser = await auth.api.getSession({
      headers: await headers(),
    });
    if (currentUser?.user) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.user.id,
          action: "CREATE_PROSPECT",
          entity: "prospect",
          entityId: prospect.id,
          details: `Ajout du prospect "${fullName}" affecté à l'agent ${agent.name} (${agent.email})`,
        },
      });
    }

    revalidatePath(`/agents/${agentId}`);
    revalidatePath("/crm");
    return { success: true, prospectId: prospect.id };
  } catch (error: any) {
    console.error("Error creating prospect:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProspectStatusAction(
  prospectId: string,
  newStatus: string
) {
  await checkAuth();

  try {
    const prospect = await prisma.prospect.update({
      where: { id: prospectId },
      data: { status: newStatus },
    });

    // Audit Log
    const currentUser = await auth.api.getSession({
      headers: await headers(),
    });
    if (currentUser?.user) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.user.id,
          action: "UPDATE_PROSPECT_STATUS",
          entity: "prospect",
          entityId: prospectId,
          details: `Changement de statut du prospect "${prospect.fullName}" → ${newStatus}`,
        },
      });
    }

    revalidatePath(`/agents/${prospect.agentId}`);
    revalidatePath("/crm");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating prospect status:", error);
    return { success: false, error: error.message };
  }
}
