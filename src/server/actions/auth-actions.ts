"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export async function seedTestAccountsAction() {
  const usersToCreate = [
    { email: "admin@aylangroup.com", name: "Directeur Admin", role: "ADMIN" },
    { email: "accountant@aylangroup.com", name: "Comptable Aylan", role: "ACCOUNTANT" },
    { email: "agent@aylangroup.com", name: "Commercial Aylan", role: "AGENT" },
    { email: "delivery@aylangroup.com", name: "Assistant de direction (Livraison)", role: "DELIVERY_ASSISTANT" },
  ];

  const results = [];

  for (const u of usersToCreate) {
    // Check if user already exists in database
    const existing = await prisma.user.findFirst({
      where: { email: u.email },
    });

    if (existing) {
      // Ensure the role is correct even if user already exists
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: u.role }
      });
      results.push({ email: u.email, status: "already_exists_and_updated", id: existing.id });
      continue;
    }

    try {
      // Better Auth email signUp
      const created = await auth.api.signUpEmail({
        body: {
          email: u.email,
          password: "password123",
          name: u.name,
        },
        headers: await headers(),
      });

      if (created && created.user) {
        // Update user role in database since it defaults to AGENT
        await prisma.user.update({
          where: { id: created.user.id },
          data: { role: u.role },
        });
        results.push({ email: u.email, status: "created", id: created.user.id });
      }
    } catch (error: any) {
      console.error(`Error creating seed user ${u.email}:`, error);
      results.push({ email: u.email, status: "error", error: error.message });
    }
  }

  return { success: true, results };
}

export async function changePasswordAction(data: {
  currentPassword?: string;
  newPassword: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: data.currentPassword || "",
        newPassword: data.newPassword,
      },
      headers: await headers(),
    });

    // Optionnel : Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CHANGE_PASSWORD",
        entity: "user",
        entityId: session.user.id,
        details: `Changement de mot de passe réussi pour l'utilisateur ${session.user.email}`,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error changing password:", error);
    return { success: false, error: error.message || "Erreur lors du changement de mot de passe" };
  }
}
