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
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    throw new Error("Accès refusé. Réservé aux administrateurs et comptables.");
  }
  return user;
}

export async function getProductsAction() {
  await checkAuth();

  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        movements: {
          orderBy: { date: "desc" },
          take: 5,
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
}) {
  const user = await checkAccountantOrAdmin();

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
        details: `Création du produit ${product.name} (SKU: ${product.sku}, Stock initial: ${product.stockAvailable})`,
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
