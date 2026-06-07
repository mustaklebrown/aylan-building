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

export async function getSalesAction() {
  const user = await checkAuth();
  const role = user.role || "AGENT";
  const isAgent = role === "AGENT";

  try {
    const sales = await prisma.sale.findMany({
      where: isAgent ? { agentId: user.id } : {},
      orderBy: { date: "desc" },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            agentCommission: true,
          },
        },
        agent: {
          select: {
            name: true,
          },
        },
        commission: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });

    const formattedSales = sales.map((sale) => ({
      id: sale.id,
      date: sale.date,
      customerName: sale.customerName,
      productName: sale.product.name,
      productSku: sale.product.sku,
      quantity: sale.quantity,
      price: sale.price,
      totalAmount: sale.price * sale.quantity,
      agentId: sale.agentId,
      agentName: sale.agent.name,
      status: sale.status,
      commissionAmount: sale.commission?.amount || 0,
      commissionStatus: sale.commission?.status || "PENDING",
    }));

    return { success: true, sales: formattedSales };
  } catch (error: any) {
    console.error("Error getting sales:", error);
    return { success: false, error: error.message };
  }
}

export async function createSaleAction(data: {
  productId: string;
  quantity: number;
  price?: number;
  customerName: string;
  agentId?: string;
  prospectId?: string;
  status?: string;
}) {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  // If agent, they can only submit for themselves. Admins/Accountants can submit for anyone.
  const targetAgentId = role === "AGENT" ? user.id : data.agentId || user.id;

  try {
    // Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get product
      const product = await tx.product.findUnique({
        where: { id: data.productId },
      });

      if (!product) {
        throw new Error("Produit non trouvé.");
      }

      // 2. Validate stock
      if (product.stockAvailable < data.quantity) {
        throw new Error(`Stock insuffisant pour ce produit (Disponible: ${product.stockAvailable}).`);
      }

      const salePrice = data.price ?? product.salePrice;

      // 3. Create Sale
      const sale = await tx.sale.create({
        data: {
          productId: data.productId,
          quantity: data.quantity,
          price: salePrice,
          customerName: data.customerName,
          agentId: targetAgentId,
          prospectId: data.prospectId || null,
          status: data.status || "PENDING",
        },
      });

      // 4. Deduct stock
      await tx.product.update({
        where: { id: data.productId },
        data: {
          stockAvailable: {
            decrement: data.quantity,
          },
        },
      });

      // 5. Record stock movement
      await tx.stockMovement.create({
        data: {
          productId: data.productId,
          type: "OUT_SALE",
          quantity: data.quantity,
          cost: product.purchasePrice,
          supplier: `Vente N° ${sale.id} à ${data.customerName}`,
        },
      });

      // 6. Create Commission record
      const commissionAmount = product.agentCommission * data.quantity;
      const commission = await tx.commission.create({
        data: {
          saleId: sale.id,
          agentId: targetAgentId,
          amount: commissionAmount,
          status: "PENDING",
        },
      });

      // 7. If linked to a prospect, update their status to CLIENT
      if (data.prospectId) {
        await tx.prospect.update({
          where: { id: data.prospectId },
          data: { status: "CLIENT" },
        });
      }

      return { sale, commission };
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_SALE",
        entity: "sale",
        entityId: result.sale.id,
        details: `Vente enregistrée : ${data.customerName} a acheté ${data.quantity} x ${data.productId} pour un montant de ${(data.price ?? 0) * data.quantity} KMF. Commission générée: ${result.commission.amount} KMF`,
      },
    });

    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/commissions");
    revalidatePath("/");
    return { success: true, saleId: result.sale.id };
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return { success: false, error: error.message };
  }
}

export async function updateDeliveryStatusAction(saleId: string, status: string) {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return { success: false, error: "Non autorisé à modifier le statut de livraison." };
  }

  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { product: true },
    });

    if (!sale) {
      return { success: false, error: "Vente non trouvée." };
    }

    const previousStatus = sale.status;

    if (previousStatus === status) {
      return { success: true };
    }

    await prisma.$transaction(async (tx) => {
      // If sale is cancelled, return items to stock
      if (status === "CANCELLED" && previousStatus !== "CANCELLED") {
        // Increment stock
        await tx.product.update({
          where: { id: sale.productId },
          data: {
            stockAvailable: {
              increment: sale.quantity,
            },
          },
        });

        // Record stock movement (Return/Cancel)
        await tx.stockMovement.create({
          data: {
            productId: sale.productId,
            type: "OUT_RETURN", // We can use OUT_RETURN or IN to signify added back
            quantity: sale.quantity,
            cost: sale.product.purchasePrice,
            supplier: `Vente annulée N° ${sale.id} (recrédité)`,
          },
        });
      }

      // If sale was CANCELLED and is reopened, deduct stock again
      if (previousStatus === "CANCELLED" && status !== "CANCELLED") {
        const product = await tx.product.findUnique({
          where: { id: sale.productId },
        });

        if (!product || product.stockAvailable < sale.quantity) {
          throw new Error(`Stock insuffisant pour réactiver cette vente (Disponible: ${product?.stockAvailable || 0}).`);
        }

        // Decrement stock
        await tx.product.update({
          where: { id: sale.productId },
          data: {
            stockAvailable: {
              decrement: sale.quantity,
            },
          },
        });

        // Record movement
        await tx.stockMovement.create({
          data: {
            productId: sale.productId,
            type: "OUT_SALE",
            quantity: sale.quantity,
            cost: product.purchasePrice,
            supplier: `Vente réactivée N° ${sale.id}`,
          },
        });
      }

      // Update sale status
      await tx.sale.update({
        where: { id: saleId },
        data: { status },
      });
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_SALE_STATUS",
        entity: "sale",
        entityId: saleId,
        details: `Statut de livraison de la vente ${saleId} mis à jour de ${previousStatus} à ${status} par ${user.name}`,
      },
    });

    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating sale status:", error);
    return { success: false, error: error.message };
  }
}
