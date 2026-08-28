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

  const role = session.user.role || "AGENT";
  if (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "LEADER" && role !== "STOCKISTE") {
    throw new Error("Non autorisé");
  }

  return session.user;
}

export async function getAgentsAction(roleFilter?: string) {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  try {
    let whereClause: any = {};

    if (role === "LEADER") {
      // Leaders see only their own Téléconseillers
      whereClause = { role: "AGENT", leaderId: user.id };
    } else if (role === "STOCKISTE") {
      // Stockiste can see all active sellers
      whereClause = {
        role: { in: ["AGENT", "ECOMMERCANT", "LEADER"] },
      };
    } else {
      // ADMIN & ACCOUNTANT
      if (roleFilter && roleFilter !== "ALL") {
        whereClause = { role: roleFilter };
      } else {
        whereClause = {
          role: { in: ["AGENT", "ECOMMERCANT", "LEADER", "STOCKISTE"] },
        };
      }
    }

    const agents = await prisma.user.findMany({
      where: whereClause,
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
        leader: {
          select: {
            id: true,
            name: true,
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

      const clientsCount = agent.prospects.filter(
        (p) => p.status === "CLIENT" || p.status === "CONFIRMED"
      ).length;

      const conversionRate =
        prospectsCount > 0 ? (clientsCount / prospectsCount) * 100 : 0;

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        createdAt: agent.createdAt,
        prospectsCount,
        salesCount,
        totalCommissions,
        totalRevenue,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        leaderName: agent.leader?.name || null,
        leaderId: agent.leaderId || null,
      };
    });

    return { success: true, agents: formattedAgents };
  } catch (error: any) {
    console.error("Error fetching agents:", error);
    return { success: false, error: error.message, agents: [] };
  }
}

export async function getLeadersAction() {
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
    return { success: false, error: error.message, leaders: [] };
  }
}

export async function getAgentDetailAction(agentId: string) {
  await checkAuth();

  try {
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      include: {
        leader: {
          select: { id: true, name: true },
        },
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
      return { success: false, error: "Utilisateur non trouvé" };
    }

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

    // Monthly data for past 6 months
    const monthlyStats = [];
    const months = ["Janv.", "Févr.", "Mars", "Avril", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      
      const startOfMonth = new Date(year, monthIndex, 1);
      const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

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
        leaderName: agent.leader?.name || null,
        leaderId: agent.leaderId || null,
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
  leaderId?: string;
  role?: string;
}) {
  const user = await checkAuth();
  const currentRole = user.role || "AGENT";

  const { name, email } = data;

  // Generate random password if not provided
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  let generatedPassword = "";
  for (let i = 0; i < 12; i++) {
    generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const passwordToUse = data.password && data.password.trim() !== "" ? data.password : generatedPassword;

  // Determine target role
  let targetRole = "AGENT";
  if (currentRole === "ADMIN" && data.role) {
    targetRole = data.role;
  }

  // Règle 1: Un E-commerçant ne peut PAS être rattaché à un Leader
  // Règle 2: Un Téléconseiller (AGENT) doit être rattaché à un Leader
  let targetLeaderId: string | null = null;

  if (targetRole === "AGENT") {
    if (currentRole === "LEADER") {
      targetLeaderId = user.id;
    } else if (data.leaderId) {
      targetLeaderId = data.leaderId;
    }
  } else {
    // E-commerçant, Stockiste, Leader, etc. : pas de leader
    targetLeaderId = null;
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { email },
    });

    if (existing) {
      return { success: false, error: "Un utilisateur avec cet email existe déjà." };
    }

    const created = await auth.api.signUpEmail({
      body: {
        email,
        password: passwordToUse,
        name,
      },
      headers: await headers(),
    });

    if (created && created.user) {
      await prisma.user.update({
        where: { id: created.user.id },
        data: {
          role: targetRole,
          leaderId: targetLeaderId,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE_USER",
          entity: "user",
          entityId: created.user.id,
          details: `Création du compte ${name} (${email}, rôle: ${targetRole})${targetLeaderId ? ` rattaché au leader ${targetLeaderId}` : ""}`,
        },
      });

      revalidatePath("/agents");
      revalidatePath("/settings");
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
    leaderId?: string | null;
  }
) {
  const user = await checkAuth();
  const currentRole = user.role || "AGENT";

  if (currentRole === "LEADER") {
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || agent.leaderId !== user.id) {
      return { success: false, error: "Vous ne pouvez modifier que vos propres agents." };
    }
  }

  const { name, email, role } = data;

  try {
    const conflict = await prisma.user.findFirst({
      where: {
        email,
        id: { not: agentId },
      },
    });

    if (conflict) {
      return { success: false, error: "Cet email est déjà utilisé par un autre utilisateur." };
    }

    const updateData: any = { name, email, role };

    // Apply leader rules
    if (role === "ECOMMERCANT" || role === "STOCKISTE") {
      updateData.leaderId = null;
    } else if (role === "AGENT" && data.leaderId !== undefined) {
      updateData.leaderId = data.leaderId || null;
    }

    const updated = await prisma.user.update({
      where: { id: agentId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_USER",
        entity: "user",
        entityId: agentId,
        details: `Mise à jour : ${name} (${email}, rôle: ${role})`,
      },
    });

    revalidatePath("/agents");
    revalidatePath("/settings");
    revalidatePath(`/agents/${agentId}`);
    return { success: true, agent: updated };
  } catch (error: any) {
    console.error("Error updating agent:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAgentAction(agentId: string) {
  const user = await checkAuth();
  const currentRole = user.role || "AGENT";

  if (currentRole !== "ADMIN") {
    return { success: false, error: "Seuls les administrateurs peuvent supprimer un compte." };
  }

  try {
    await prisma.user.delete({
      where: { id: agentId },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE_USER",
        entity: "user",
        entityId: agentId,
        details: `Suppression du compte utilisateur ${agentId}`,
      },
    });

    revalidatePath("/agents");
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting agent:", error);
    return { success: false, error: error.message };
  }
}

export const deleteUserAction = deleteAgentAction;

export async function getUsersAction() {
  const user = await checkAuth();
  if (user.role !== "ADMIN") {
    return { success: false, error: "Non autorisé" };
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        leaderId: u.leaderId,
        leaderName: u.leader?.name || null,
      })),
    };
  } catch (error: any) {
    console.error("Error getting users:", error);
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
  agentId?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { success: false, error: "Non authentifié" };
  }

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

  const targetAgentId = agentId || session.user.id;

  try {
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
        agentId: targetAgentId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_PROSPECT",
        entity: "prospect",
        entityId: prospect.id,
        details: `Ajout du prospect "${fullName}"`,
      },
    });

    revalidatePath("/crm");
    revalidatePath(`/agents/${targetAgentId}`);
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    const prospect = await prisma.prospect.update({
      where: { id: prospectId },
      data: { status: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_PROSPECT_STATUS",
        entity: "prospect",
        entityId: prospectId,
        details: `Changement de statut du prospect "${prospect.fullName}" → ${newStatus}`,
      },
    });

    revalidatePath("/crm");
    revalidatePath(`/agents/${prospect.agentId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating prospect status:", error);
    return { success: false, error: error.message };
  }
}
