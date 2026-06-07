"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// Get current session (any authenticated user)
async function getAuthUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Non authentifié");
  }

  return session.user;
}

/**
 * Fetch all prospects for the current user.
 * - Agents see only their own prospects
 * - Admin/Accountant see all prospects
 */
export async function getProspectsAction() {
  const user = await getAuthUser();
  const role = user.role || "AGENT";

  try {
    const where = role === "AGENT" ? { agentId: user.id } : {};

    const prospects = await prisma.prospect.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      prospects: prospects.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        phone: p.phone,
        whatsapp: p.whatsapp,
        address: p.address,
        city: p.city,
        source: p.source,
        interestedProduct: p.interestedProduct,
        comments: p.comments,
        status: p.status,
        agentId: p.agentId,
        agentName: p.agent.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    };
  } catch (error: any) {
    console.error("Error fetching prospects:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new prospect.
 * - Agents always assign to themselves
 * - Admin can assign to any agent
 */
export async function createProspectForAgentAction(data: {
  fullName: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  source?: string;
  interestedProduct?: string;
  comments?: string;
  status?: string;
}) {
  const user = await getAuthUser();

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
  } = data;

  if (!fullName.trim()) {
    return { success: false, error: "Le nom complet est obligatoire." };
  }

  // Agent always assigns to self
  const agentId = user.id;

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
        agentId,
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_PROSPECT",
        entity: "prospect",
        entityId: prospect.id,
        details: `Ajout du prospect "${fullName}" par l'agent ${user.name}`,
      },
    });

    revalidatePath("/crm");
    revalidatePath(`/agents/${agentId}`);
    return { success: true, prospectId: prospect.id };
  } catch (error: any) {
    console.error("Error creating prospect:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a prospect's status.
 * - Agents can only update their own prospects
 * - Admin can update any prospect
 */
export async function updateProspectStatusForAgentAction(
  prospectId: string,
  newStatus: string
) {
  const user = await getAuthUser();
  const role = user.role || "AGENT";

  try {
    // Verify ownership for agents
    const existing = await prisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!existing) {
      return { success: false, error: "Prospect non trouvé." };
    }

    if (role === "AGENT" && existing.agentId !== user.id) {
      return { success: false, error: "Vous ne pouvez modifier que vos propres prospects." };
    }

    const prospect = await prisma.prospect.update({
      where: { id: prospectId },
      data: { status: newStatus },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
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
