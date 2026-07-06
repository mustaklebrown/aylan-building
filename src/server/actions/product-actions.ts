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

async function checkAccountantOrAdmin() {
  const user = await checkAuth();
  const role = user.role || "AGENT";
  if (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "LEADER") {
    throw new Error("Accès refusé. Réservé aux administrateurs, comptables et leaders.");
  }
  return user;
}

export async function getProductsAction() {
  const user = await checkAuth();
  const role = user.role || "AGENT";

  try {
    // Build filter based on role
    let whereClause: any = {};
    if (role === "LEADER") {
      // Leaders see common products + their own products
      whereClause = {
        OR: [
          { isCommon: true },
          { leaderId: user.id },
        ],
      };
    } else if (role === "AGENT") {
      // Agents see common products + products of their leader
      const currentAgent = await prisma.user.findUnique({
        where: { id: user.id },
        select: { leaderId: true },
      });
      if (currentAgent?.leaderId) {
        whereClause = {
          OR: [
            { isCommon: true },
            { leaderId: currentAgent.leaderId },
          ],
        };
      } else {
        // Agent without a leader: only common products
        whereClause = { isCommon: true };
      }
    }
    // ADMIN and ACCOUNTANT see everything (whereClause stays {})

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      include: {
        movements: {
          orderBy: { date: "desc" },
          take: 5,
        },
        leader: {
          select: {
            id: true,
            name: true,
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
      stockAvailable: p.stockAvailable,
      alertThreshold: p.alertThreshold,
      isAlert: p.stockAvailable <= p.alertThreshold,
      isCommon: p.isCommon,
      leaderId: p.leaderId,
      leaderName: p.leader?.name || null,
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
  agentCommission: number;
  stockAvailable: number;
  alertThreshold: number;
  isCommon?: boolean;
  leaderId?: string;
}) {
  const user = await checkAccountantOrAdmin();
  const role = user.role || "AGENT";

  // Determine product ownership
  let isCommon = true;
  let productLeaderId: string | null = null;

  if (role === "LEADER") {
    // Leaders always create products for themselves (not common)
    isCommon = false;
    productLeaderId = user.id;
  } else if (role === "ADMIN") {
    // Admin can choose
    isCommon = data.isCommon !== undefined ? data.isCommon : true;
    productLeaderId = data.leaderId || null;
    if (productLeaderId) {
      isCommon = false;
    }
  }

  try {
    // Check SKU uniqueness
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existing) {
      return { success: false, error: "Un produit avec ce SKU existe déjà." };
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        category: data.category || "Autre",
        description: data.description,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        agentCommission: data.agentCommission,
        stockAvailable: data.stockAvailable,
        alertThreshold: data.alertThreshold,
        isCommon,
        leaderId: productLeaderId,
      },
    });

    // If initial stock is provided, record a stock movement
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

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_PRODUCT",
        entity: "product",
        entityId: product.id,
        details: `Création du produit ${product.name} (SKU: ${product.sku}, Stock initial: ${product.stockAvailable}, ${isCommon ? "Commun" : `Spécifique leader ${productLeaderId}`})`,
      },
    });

    revalidatePath("/products");
    return { success: true, product };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return { success: false, error: error.message };
  }
}

export async function recordStockMovementAction(data: {
  productId: string;
  type: "IN" | "OUT_LOSS" | "OUT_DAMAGE" | "OUT_RETURN";
  quantity: number;
  cost?: number;
  supplier?: string;
}) {
  const user = await checkAccountantOrAdmin();

  try {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return { success: false, error: "Produit non trouvé." };
    }

    // Calculate new stock
    let newStock = product.stockAvailable;
    if (data.type === "IN" || data.type === "OUT_RETURN") {
      newStock += data.quantity;
    } else if (data.type === "OUT_LOSS" || data.type === "OUT_DAMAGE") {
      newStock -= data.quantity;
      if (newStock < 0) {
        return { success: false, error: "Stock insuffisant pour cette sortie." };
      }
    }

    // Record movement
    const movement = await prisma.stockMovement.create({
      data: {
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        cost: data.cost,
        supplier: data.supplier,
      },
    });

    // Update product stock
    await prisma.product.update({
      where: { id: data.productId },
      data: { stockAvailable: newStock },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RECORD_STOCK_MOVEMENT",
        entity: "product",
        entityId: data.productId,
        details: `Mouvement de stock de type ${data.type} (${data.quantity} unités) pour le produit ${product.name}. Nouveau stock: ${newStock}`,
      },
    });

    revalidatePath("/products");
    return { success: true, movement };
  } catch (error: any) {
    console.error("Error recording stock movement:", error);
    return { success: false, error: error.message };
  }
}
