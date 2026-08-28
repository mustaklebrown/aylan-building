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

export async function getProductsAction() {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  try {
    // Build filter based on role
    let whereClause: any = {};

    if (role === "STOCKISTE") {
      // Stockiste sees all products they own
      whereClause = { stockisteId: user.id };
    } else if (role === "ECOMMERCANT") {
      // E-commerçant sees active products that allow all e-commerçants OR are assigned specifically to them
      whereClause = {
        isActive: true,
        OR: [
          { allowAllEcommercants: true },
          { assignments: { some: { userId: user.id, allowed: true } } },
        ],
      };
    } else if (role === "LEADER") {
      // Leaders see active products that allow all leaders OR are assigned to them OR created by them
      whereClause = {
        isActive: true,
        OR: [
          { allowAllLeaders: true },
          { leaderId: user.id },
          { assignments: { some: { userId: user.id, allowed: true } } },
        ],
      };
    } else if (role === "AGENT") {
      // Téléconseillers see active products allowed for their leader
      const currentAgent = await prisma.user.findUnique({
        where: { id: user.id },
        select: { leaderId: true },
      });

      if (currentAgent?.leaderId) {
        whereClause = {
          isActive: true,
          OR: [
            { allowAllLeaders: true },
            { leaderId: currentAgent.leaderId },
            { assignments: { some: { userId: currentAgent.leaderId, allowed: true } } },
            { assignments: { some: { userId: user.id, allowed: true } } },
          ],
        };
      } else {
        whereClause = { isActive: true, allowAllLeaders: true };
      }
    }
    // ADMIN, ACCOUNTANT, DELIVERY_ASSISTANT see all products

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      include: {
        movements: {
          orderBy: { date: "desc" },
          take: 5,
        },
        stockiste: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        leader: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    const stockValue = products.reduce(
      (sum, p) => sum + p.purchasePrice * p.stockAvailable,
      0
    );

    const stockSalesValue = products.reduce(
      (sum, p) => sum + p.salePrice * p.stockAvailable,
      0
    );

    const lowStockCount = products.filter(
      (p) => p.stockAvailable <= p.alertThreshold
    ).length;

    const formattedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category || "Autre",
      description: p.description || "",
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      agentCommission: p.agentCommission,
      ecommercantCommission: p.ecommercantCommission,
      leaderCommission: p.leaderCommission,
      stockAvailable: p.stockAvailable,
      alertThreshold: p.alertThreshold,
      isAlert: p.stockAvailable <= p.alertThreshold,
      isActive: p.isActive,
      isCommon: p.isCommon,
      stockisteId: p.stockisteId,
      stockisteName: p.stockiste?.name || null,
      stockisteEmail: p.stockiste?.email || null,
      leaderId: p.leaderId,
      leaderName: p.leader?.name || null,
      allowAllEcommercants: p.allowAllEcommercants,
      allowAllLeaders: p.allowAllLeaders,
      assignments: p.assignments,
      recentMovements: p.movements,
    }));

    return {
      success: true,
      products: formattedProducts,
      summary: {
        totalProducts: products.length,
        stockValue,
        stockSalesValue,
        lowStockCount,
      },
    };
  } catch (error: any) {
    console.error("Error getting products:", error);
    return { success: false, error: error.message };
  }
}

export async function createProductAction(data: {
  name: string;
  sku: string;
  category?: string;
  description?: string;
  purchasePrice: number;
  salePrice: number;
  agentCommission?: number;
  ecommercantCommission?: number;
  leaderCommission?: number;
  stockAvailable: number;
  alertThreshold: number;
  stockisteId?: string;
  isCommon?: boolean;
  leaderId?: string;
  allowAllEcommercants?: boolean;
  allowAllLeaders?: boolean;
  isActive?: boolean;
}) {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  if (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "STOCKISTE" && role !== "LEADER") {
    return { success: false, error: "Non autorisé à créer un produit." };
  }

  // Determine Stockiste owner
  let stockisteId: string | null = null;
  if (role === "STOCKISTE") {
    stockisteId = user.id;
  } else if (role === "ADMIN" || role === "ACCOUNTANT") {
    stockisteId = data.stockisteId || user.id;
  }

  try {
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existing) {
      return { success: false, error: "Un produit avec ce SKU existe déjà." };
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        category: data.category || "Autre",
        description: data.description,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        agentCommission: data.agentCommission ?? 0,
        ecommercantCommission: data.ecommercantCommission ?? 0,
        leaderCommission: data.leaderCommission ?? 0,
        stockAvailable: data.stockAvailable,
        alertThreshold: data.alertThreshold,
        stockisteId: stockisteId,
        isCommon: data.isCommon ?? true,
        leaderId: data.leaderId || null,
        allowAllEcommercants: data.allowAllEcommercants ?? true,
        allowAllLeaders: data.allowAllLeaders ?? true,
        isActive: data.isActive ?? true,
      },
    });

    if (data.stockAvailable > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: data.stockAvailable,
          cost: data.purchasePrice,
          supplier: "Stock Initial",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_PRODUCT",
        entity: "product",
        entityId: product.id,
        details: `Création du produit ${product.name} (SKU: ${product.sku}, Stock initial: ${product.stockAvailable}, Stockiste: ${stockisteId || "Non assigné"})`,
      },
    });

    revalidatePath("/products");
    revalidatePath("/");
    return { success: true, product };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProductAction(data: {
  id: string;
  name: string;
  sku: string;
  category?: string;
  description?: string;
  purchasePrice: number;
  salePrice: number;
  agentCommission?: number;
  ecommercantCommission?: number;
  leaderCommission?: number;
  alertThreshold: number;
  stockisteId?: string;
  allowAllEcommercants?: boolean;
  allowAllLeaders?: boolean;
  isActive?: boolean;
}) {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  if (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "STOCKISTE") {
    return { success: false, error: "Non autorisé à modifier un produit." };
  }

  try {
    const existing = await prisma.product.findUnique({
      where: { id: data.id },
    });

    if (!existing) {
      return { success: false, error: "Produit non trouvé." };
    }

    if (role === "STOCKISTE" && existing.stockisteId !== user.id) {
      return { success: false, error: "Vous ne pouvez modifier que vos propres produits." };
    }

    const updated = await prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        sku: data.sku,
        category: data.category || existing.category,
        description: data.description,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        agentCommission: data.agentCommission ?? existing.agentCommission,
        ecommercantCommission: data.ecommercantCommission ?? existing.ecommercantCommission,
        leaderCommission: data.leaderCommission ?? existing.leaderCommission,
        alertThreshold: data.alertThreshold,
        stockisteId: role === "ADMIN" ? (data.stockisteId || existing.stockisteId) : existing.stockisteId,
        allowAllEcommercants: data.allowAllEcommercants ?? existing.allowAllEcommercants,
        allowAllLeaders: data.allowAllLeaders ?? existing.allowAllLeaders,
        isActive: data.isActive ?? existing.isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_PRODUCT",
        entity: "product",
        entityId: updated.id,
        details: `Modification du produit ${updated.name} (SKU: ${updated.sku}) par ${user.name}`,
      },
    });

    revalidatePath("/products");
    revalidatePath("/");
    return { success: true, product: updated };
  } catch (error: any) {
    console.error("Error updating product:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleProductActiveAction(productId: string) {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  if (role !== "ADMIN" && role !== "STOCKISTE") {
    return { success: false, error: "Non autorisé." };
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return { success: false, error: "Produit non trouvé." };

    if (role === "STOCKISTE" && product.stockisteId !== user.id) {
      return { success: false, error: "Non autorisé." };
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { isActive: !product.isActive },
    });

    revalidatePath("/products");
    return { success: true, isActive: updated.isActive };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordStockMovementAction(data: {
  productId: string;
  type: "IN" | "OUT_LOSS" | "OUT_DAMAGE" | "OUT_RETURN" | "CORRECTION";
  quantity: number;
  cost?: number;
  supplier?: string;
}) {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  if (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "STOCKISTE") {
    return { success: false, error: "Non autorisé à modifier les stocks." };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return { success: false, error: "Produit non trouvé." };
    }

    if (role === "STOCKISTE" && product.stockisteId !== user.id) {
      return { success: false, error: "Vous ne pouvez modifier le stock que de vos propres produits." };
    }

    let newStock = product.stockAvailable;
    if (data.type === "IN" || data.type === "OUT_RETURN") {
      newStock += data.quantity;
    } else if (data.type === "OUT_LOSS" || data.type === "OUT_DAMAGE") {
      newStock -= data.quantity;
      if (newStock < 0) {
        return { success: false, error: "Stock insuffisant pour cette sortie." };
      }
    } else if (data.type === "CORRECTION") {
      newStock = data.quantity;
    }

    const movement = await prisma.stockMovement.create({
      data: {
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        cost: data.cost,
        supplier: data.supplier,
      },
    });

    await prisma.product.update({
      where: { id: data.productId },
      data: { stockAvailable: newStock },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RECORD_STOCK_MOVEMENT",
        entity: "product",
        entityId: data.productId,
        details: `Mouvement de stock de type ${data.type} (${data.quantity} unités) pour ${product.name}. Nouveau stock: ${newStock}`,
      },
    });

    revalidatePath("/products");
    revalidatePath("/");
    return { success: true, movement, newStock };
  } catch (error: any) {
    console.error("Error recording stock movement:", error);
    return { success: false, error: error.message };
  }
}

export async function getStockistesAction() {
  try {
    const user = await checkAuth();
    const stockistes = await prisma.user.findMany({
      where: {
        OR: [
          { role: "STOCKISTE" },
          { role: "ADMIN" },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, stockistes };
  } catch (error: any) {
    return { success: false, error: error.message, stockistes: [] };
  }
}
