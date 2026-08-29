'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function checkAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Non authentifié');
  }

  return session.user;
}

export async function getSalesAction() {
  const user = await checkAuth();
  const role = user.role || 'AGENT';

  // Build where clause based on role
  let whereClause: any = {};
  if (role === 'AGENT') {
    whereClause = { agentId: user.id };
  } else if (role === 'ECOMMERCANT') {
    whereClause = { agentId: user.id };
  } else if (role === 'STOCKISTE') {
    whereClause = { stockisteId: user.id };
  } else if (role === 'LEADER') {
    whereClause = {
      OR: [
        { agent: { leaderId: user.id } },
        { leaderId: user.id },
      ],
    };
  } else if (role === 'DELIVERY') {
    whereClause = {
      OR: [
        { driverId: user.id },
        { shippingType: 'DELIVERY', status: 'PENDING', driverId: null },
      ],
    };
  }
  // ADMIN, ACCOUNTANT, DELIVERY_ASSISTANT see all

  try {
    const sales = await prisma.sale.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            agentCommission: true,
            ecommercantCommission: true,
            leaderCommission: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
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
        driver: {
          select: {
            id: true,
            name: true,
          },
        },
        commissions: {
          select: {
            id: true,
            amount: true,
            status: true,
            role: true,
            agentId: true,
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
      totalAmount: sale.price * sale.quantity + (sale.shippingFee || 0),
      agentId: sale.agentId,
      agentName: sale.agent.name,
      sellerRole: sale.sellerRole || sale.agent.role || 'AGENT',
      stockisteId: sale.stockisteId,
      stockisteName: sale.stockiste?.name || null,
      leaderId: sale.leaderId,
      leaderName: sale.leader?.name || null,
      driverId: sale.driverId,
      driverName: sale.driver?.name || null,
      status: sale.status,
      sellerCommission: sale.sellerCommission,
      leaderCommission: sale.leaderCommission,
      stockisteRevenue: sale.stockisteRevenue,
      commissions: sale.commissions,
      shippingType: sale.shippingType,
      shippingCity: sale.shippingCity,
      shippingAddress: sale.shippingAddress,
      shippingFee: sale.shippingFee,
    }));

    return { success: true, sales: formattedSales };
  } catch (error: any) {
    console.error('Error getting sales:', error);
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
  shippingType?: string;
  shippingCity?: string;
  shippingAddress?: string;
  shippingFee?: number;
}) {
  const user = await checkAuth();
  const callerRole = user.role || 'AGENT';

  // Determine target seller ID
  let targetSellerId = user.id;
  if (callerRole === 'AGENT' || callerRole === 'ECOMMERCANT') {
    targetSellerId = user.id;
  } else if (callerRole === 'LEADER') {
    targetSellerId = data.agentId || user.id;
  } else {
    targetSellerId = data.agentId || user.id;
  }

  const quantity = Math.max(1, Math.floor(Number(data.quantity) || 1));
  const shippingFee = Math.max(0, Number(data.shippingFee) || 0);

  if (!data.productId || typeof data.productId !== 'string' || data.productId.trim() === '') {
    return { success: false, error: 'Veuillez sélectionner un produit valide.' };
  }

  if (!data.customerName || typeof data.customerName !== 'string' || data.customerName.trim() === '') {
    return { success: false, error: 'Veuillez renseigner le nom du client.' };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get product
      const product = await tx.product.findUnique({
        where: { id: data.productId.trim() },
      });

      if (!product) {
        throw new Error('Produit non trouvé.');
      }

      if (!product.isActive) {
        throw new Error('Ce produit est actuellement désactivé par le stockiste.');
      }

      // 2. Validate stock
      if (product.stockAvailable < quantity) {
        throw new Error(
          `Stock insuffisant pour ce produit (Disponible: ${product.stockAvailable}).`,
        );
      }

      // 3. Get seller user
      let seller = await tx.user.findUnique({
        where: { id: targetSellerId },
        select: { id: true, name: true, role: true, leaderId: true },
      });

      if (!seller && targetSellerId !== user.id) {
        seller = await tx.user.findUnique({
          where: { id: user.id },
          select: { id: true, name: true, role: true, leaderId: true },
        });
        targetSellerId = user.id;
      }

      if (!seller) {
        throw new Error('Vendeur non trouvé.');
      }

      const sellerRole = seller.role === 'ECOMMERCANT' ? 'ECOMMERCANT' : 'AGENT';
      const salePrice = Number(data.price ?? product.salePrice) || product.salePrice;
      const totalSaleGross = salePrice * quantity;

      // 4. Calculate Commissions & Stockiste Revenue
      let sellerCommission = 0;
      let leaderCommission = 0;
      let leaderId: string | null = null;

      if (sellerRole === 'ECOMMERCANT') {
        // Independent E-commerçant: no leader, higher commission
        sellerCommission = (product.ecommercantCommission || 0) * quantity;
        leaderCommission = 0;
        leaderId = null;
      } else {
        // Téléconseiller: attached to leader
        sellerCommission = (product.agentCommission || 0) * quantity;
        if (seller.leaderId) {
          const leaderExists = await tx.user.findUnique({
            where: { id: seller.leaderId },
            select: { id: true },
          });
          if (leaderExists) {
            leaderId = seller.leaderId;
            leaderCommission = (product.leaderCommission || 0) * quantity;
          }
        }
      }

      const stockisteRevenue = Math.max(0, totalSaleGross - sellerCommission - leaderCommission);

      // Validate prospect if provided
      let validProspectId: string | null = null;
      if (data.prospectId && data.prospectId !== 'none' && data.prospectId.trim() !== '') {
        const existingProspect = await tx.prospect.findUnique({
          where: { id: data.prospectId },
          select: { id: true },
        });
        if (existingProspect) {
          validProspectId = existingProspect.id;
        }
      }

      // Validate stockiste owner if provided
      let validStockisteId: string | null = null;
      if (product.stockisteId) {
        const stockisteExists = await tx.user.findUnique({
          where: { id: product.stockisteId },
          select: { id: true },
        });
        if (stockisteExists) {
          validStockisteId = stockisteExists.id;
        }
      }

      // 5. Create Sale with immutable snapshots
      const sale = await tx.sale.create({
        data: {
          productId: product.id,
          quantity: quantity,
          price: salePrice,
          customerName: data.customerName.trim(),
          agentId: seller.id,
          prospectId: validProspectId,
          status: data.status || 'PENDING',
          sellerRole: sellerRole,
          leaderId: leaderId,
          stockisteId: validStockisteId,
          sellerCommission: sellerCommission,
          leaderCommission: leaderCommission,
          stockisteRevenue: stockisteRevenue,
          shippingType: data.shippingType || 'PICKUP',
          shippingCity: data.shippingCity || null,
          shippingAddress: data.shippingAddress || null,
          shippingFee: shippingFee,
        },
      });

      // 6. Deduct stock & record stock movement
      await tx.product.update({
        where: { id: product.id },
        data: {
          stockAvailable: {
            decrement: quantity,
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: 'OUT_SALE',
          quantity: quantity,
          cost: product.purchasePrice,
          supplier: `Vente N° ${sale.id} (${sellerRole}: ${seller.name})`,
        },
      });

      // 7. Create Commission records ONLY if sale is validated (not PENDING and not CANCELLED)
      const isSaleValidated =
        sale.status !== 'PENDING' && sale.status !== 'CANCELLED';

      if (isSaleValidated) {
        if (sellerCommission > 0) {
          await tx.commission.create({
            data: {
              saleId: sale.id,
              agentId: targetSellerId,
              role: sellerRole,
              amount: sellerCommission,
              status: 'PENDING',
            },
          });
        }

        if (leaderId && leaderCommission > 0) {
          await tx.commission.create({
            data: {
              saleId: sale.id,
              agentId: leaderId,
              role: 'LEADER',
              amount: leaderCommission,
              status: 'PENDING',
            },
          });
        }
      }

      // 8. If linked to a prospect, update their status to CLIENT
      if (validProspectId) {
        try {
          await tx.prospect.update({
            where: { id: validProspectId },
            data: { status: 'CLIENT' },
          });
        } catch (prospectErr) {
          console.warn('Could not update prospect status:', prospectErr);
        }
      }

      return { sale };
    });

    // Notify drivers if delivery requested
    try {
      if (result.sale.shippingType === 'DELIVERY') {
        const driversAndAssistants = await prisma.user.findMany({
          where: {
            OR: [
              { role: 'DELIVERY', isAvailable: true },
              { role: 'DELIVERY_ASSISTANT' },
            ],
          },
        });
        for (const targetUser of driversAndAssistants) {
          await prisma.notification.create({
            data: {
              userId: targetUser.id,
              title: '🚚 Nouvelle livraison disponible',
              message: `Commande N° ${result.sale.id.slice(-6).toUpperCase()} (${data.customerName}) en attente d'un livreur à ${data.shippingCity || 'Moroni'}.`,
            },
          });
        }
      }
    } catch (notifErr) {
      console.error('Error sending delivery notifications:', notifErr);
    }

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_SALE',
          entity: 'sale',
          entityId: result.sale.id,
          details: `Vente enregistrée par ${user.name} : ${data.customerName} - ${quantity}x (${result.sale.price * quantity} KMF). Commission vendeur: ${result.sale.sellerCommission} KMF, Leader: ${result.sale.leaderCommission} KMF, Stockiste net: ${result.sale.stockisteRevenue} KMF`,
        },
      });
    } catch (auditErr) {
      console.error('Error creating audit log:', auditErr);
    }

    revalidatePath('/sales');
    revalidatePath('/products');
    revalidatePath('/commissions');
    revalidatePath('/deliveries');
    revalidatePath('/');
    return { success: true, saleId: result.sale.id };
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return { success: false, error: error.message };
  }
}

export async function updateDeliveryStatusAction(
  saleId: string,
  status: string,
) {
  const user = await checkAuth();
  const role = user.role || 'AGENT';

  if (
    role !== 'ADMIN' &&
    role !== 'ACCOUNTANT' &&
    role !== 'DELIVERY_ASSISTANT' &&
    role !== 'DELIVERY' &&
    role !== 'STOCKISTE'
  ) {
    return {
      success: false,
      error: 'Non autorisé à modifier le statut de livraison.',
    };
  }

  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { product: true },
    });

    if (!sale) {
      return { success: false, error: 'Vente non trouvée.' };
    }

    const previousStatus = sale.status;
    if (previousStatus === status) {
      return { success: true };
    }

    await prisma.$transaction(async (tx) => {
      // If sale is cancelled, return items to stock
      if (status === 'CANCELLED' && previousStatus !== 'CANCELLED') {
        await tx.product.update({
          where: { id: sale.productId },
          data: {
            stockAvailable: {
              increment: sale.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: sale.productId,
            type: 'OUT_RETURN',
            quantity: sale.quantity,
            cost: sale.product.purchasePrice,
            supplier: `Vente annulée N° ${sale.id} (recrédité)`,
          },
        });
      }

      // If sale was CANCELLED and is reopened, deduct stock again
      if (previousStatus === 'CANCELLED' && status !== 'CANCELLED') {
        const product = await tx.product.findUnique({
          where: { id: sale.productId },
        });

        if (!product || product.stockAvailable < sale.quantity) {
          throw new Error(
            `Stock insuffisant pour réactiver cette vente (Disponible: ${product?.stockAvailable || 0}).`,
          );
        }

        await tx.product.update({
          where: { id: sale.productId },
          data: {
            stockAvailable: {
              decrement: sale.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: sale.productId,
            type: 'OUT_SALE',
            quantity: sale.quantity,
            cost: product.purchasePrice,
            supplier: `Vente réactivée N° ${sale.id}`,
          },
        });
      }

      // Manage Commission Lifecycle
      const isValidatedStatus =
        status === 'CONFIRMED' ||
        status === 'SHIPPED' ||
        status === 'DELIVERED';

      if (isValidatedStatus) {
        // Ensure commissions exist
        const existingCommissions = await tx.commission.findMany({
          where: { saleId },
        });

        if (existingCommissions.length === 0) {
          if (sale.sellerCommission > 0) {
            await tx.commission.create({
              data: {
                saleId,
                agentId: sale.agentId,
                role: sale.sellerRole || 'AGENT',
                amount: sale.sellerCommission,
                status: 'PENDING',
              },
            });
          }

          if (sale.leaderId && sale.leaderCommission > 0) {
            await tx.commission.create({
              data: {
                saleId,
                agentId: sale.leaderId,
                role: 'LEADER',
                amount: sale.leaderCommission,
                status: 'PENDING',
              },
            });
          }
        }
      } else {
        // Remove commission if the sale is cancelled or pending, but only if it hasn't been paid yet
        await tx.commission.deleteMany({
          where: {
            saleId,
            status: 'PENDING',
          },
        });
      }

      // Prepare update payload
      const updateData: any = { status };

      if (role === 'DELIVERY' && status === 'CONFIRMED') {
        if (sale.driverId && sale.driverId !== user.id) {
          throw new Error(
            'Cette livraison a déjà été prise en charge par un autre livreur.',
          );
        }
        updateData.driverId = user.id;
        await tx.user.update({
          where: { id: user.id },
          data: { isAvailable: false },
        });
      }

      if (
        role === 'DELIVERY' &&
        (status === 'SHIPPED' || status === 'DELIVERED')
      ) {
        if (sale.driverId !== user.id) {
          throw new Error(
            "Vous n'êtes pas le livreur assigné pour cette livraison.",
          );
        }
      }

      if (status === 'DELIVERED' && sale.driverId) {
        await tx.user.update({
          where: { id: sale.driverId },
          data: { isAvailable: true },
        });
      }

      await tx.sale.update({ where: { id: saleId }, data: updateData });
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_SALE_STATUS',
        entity: 'sale',
        entityId: saleId,
        details: `Statut de livraison de la vente ${saleId} mis à jour de ${previousStatus} à ${status} par ${user.name}`,
      },
    });

    revalidatePath('/sales');
    revalidatePath('/products');
    revalidatePath('/commissions');
    revalidatePath('/deliveries');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating sale status:', error);
    return { success: false, error: error.message };
  }
}

export async function toggleDriverAvailabilityAction(targetState?: boolean) {
  try {
    const user = await checkAuth();

    let newAvailability = targetState;
    if (newAvailability === undefined) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isAvailable: true },
      });
      newAvailability = !(dbUser?.isAvailable ?? false);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isAvailable: newAvailability },
      select: { id: true, name: true, isAvailable: true },
    });

    revalidatePath('/deliveries');
    revalidatePath('/');

    return { success: true, isAvailable: updatedUser.isAvailable };
  } catch (error: any) {
    console.error('Error toggling availability:', error);
    return { success: false, error: error.message };
  }
}

export async function claimDeliveryAction(saleId: string) {
  try {
    const user = await checkAuth();
    if (user.role !== 'DELIVERY' && user.role !== 'ADMIN' && user.role !== 'DELIVERY_ASSISTANT') {
      return { success: false, error: "Seuls les livreurs et l'équipe logistique peuvent prendre en charge un colis." };
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      return { success: false, error: 'Commande non trouvée.' };
    }

    if (sale.driverId && sale.driverId !== user.id) {
      return { success: false, error: 'Cette livraison est déjà prise en charge par un autre livreur.' };
    }

    const newStatus = sale.status === 'PENDING' ? 'CONFIRMED' : sale.status;

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: saleId },
        data: {
          driverId: user.id,
          status: newStatus,
        },
      });

      if (user.role === 'DELIVERY') {
        await tx.user.update({
          where: { id: user.id },
          data: { isAvailable: false },
        });
      }

      // Ensure commissions are created if the sale transitioned from PENDING to CONFIRMED
      if (sale.status === 'PENDING' && newStatus === 'CONFIRMED') {
        const existingCommissions = await tx.commission.findMany({
          where: { saleId },
        });

        if (existingCommissions.length === 0) {
          if (sale.sellerCommission > 0) {
            await tx.commission.create({
              data: {
                saleId,
                agentId: sale.agentId,
                role: sale.sellerRole || 'AGENT',
                amount: sale.sellerCommission,
                status: 'PENDING',
              },
            });
          }

          if (sale.leaderId && sale.leaderCommission > 0) {
            await tx.commission.create({
              data: {
                saleId,
                agentId: sale.leaderId,
                role: 'LEADER',
                amount: sale.leaderCommission,
                status: 'PENDING',
              },
            });
          }
        }
      }
    });

    // Safely send notifications outside transaction
    try {
      const orConditions: any[] = [{ role: 'DELIVERY_ASSISTANT' }];
      if (sale.agentId) {
        orConditions.push({ id: sale.agentId });
      }

      const usersToNotify = await prisma.user.findMany({
        where: { OR: orConditions },
      });

      for (const u of usersToNotify) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            title: '📦 Livreur assigné',
            message: `Le livreur ${user.name} a pris en charge la livraison N° ${saleId.slice(-6).toUpperCase()}.`,
          },
        });
      }
    } catch (notifErr) {
      console.error('Error sending claim notifications:', notifErr);
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CLAIM_DELIVERY',
          entity: 'sale',
          entityId: saleId,
          details: `Livraison N° ${saleId} prise en charge par ${user.name} (${user.role})`,
        },
      });
    } catch (auditErr) {
      console.error('Error creating audit log:', auditErr);
    }

    revalidatePath('/deliveries');
    revalidatePath('/sales');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    console.error('Error claiming delivery:', error);
    return { success: false, error: error.message };
  }
}

export async function rejectDeliveryAction(saleId: string) {
  try {
    const user = await checkAuth();
    if (user.role !== 'DELIVERY') {
      return { success: false, error: 'Seuls les livreurs peuvent refuser une livraison.' };
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      return { success: false, error: 'Commande non trouvée.' };
    }

    if (sale.driverId === user.id) {
      await prisma.$transaction(async (tx) => {
        await tx.sale.update({
          where: { id: saleId },
          data: {
            driverId: null,
            status: 'PENDING',
          },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { isAvailable: true },
        });
      });

      // Safely send notifications outside transaction
      try {
        const assistants = await prisma.user.findMany({
          where: { role: 'DELIVERY_ASSISTANT' },
        });
        for (const a of assistants) {
          await prisma.notification.create({
            data: {
              userId: a.id,
              title: '⚠️ Livraison refusée',
              message: `Le livreur ${user.name} a refusé la livraison N° ${saleId.slice(-6).toUpperCase()}. Elle est de nouveau disponible.`,
            },
          });
        }
      } catch (notifErr) {
        console.error('Error sending reject notifications:', notifErr);
      }
    }

    try {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          read: false,
        },
        data: { read: true },
      });
    } catch (notifErr) {
      console.error('Error updating driver notifications:', notifErr);
    }

    revalidatePath('/deliveries');
    revalidatePath('/sales');
    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting delivery:', error);
    return { success: false, error: error.message };
  }
}

export async function getAvailableDeliveriesAction() {
  try {
    const user = await checkAuth();
    if (user.role !== 'DELIVERY' && user.role !== 'DELIVERY_ASSISTANT') {
      return { success: false, error: 'Accès refusé.', sales: [] };
    }

    let whereClause: any = {};
    if (user.role === 'DELIVERY') {
      whereClause = {
        OR: [
          { driverId: user.id },
          { shippingType: 'DELIVERY', status: 'PENDING', driverId: null },
        ],
      };
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        product: { select: { name: true, sku: true } },
        agent: { select: { name: true } },
        driver: { select: { id: true, name: true } },
        prospect: { select: { phone: true, whatsapp: true } },
      },
    });

    const formattedSales = sales.map((sale) => ({
      id: sale.id,
      date: sale.date,
      customerName: sale.customerName,
      customerPhone: sale.prospect?.phone || 'Non spécifié',
      customerWhatsapp: sale.prospect?.whatsapp || null,
      productName: sale.product.name,
      productSku: sale.product.sku,
      quantity: sale.quantity,
      price: sale.price,
      totalAmount: sale.price * sale.quantity + (sale.shippingFee || 0),
      agentName: sale.agent.name,
      status: sale.status,
      shippingType: sale.shippingType,
      shippingCity: sale.shippingCity,
      shippingAddress: sale.shippingAddress,
      shippingFee: sale.shippingFee,
      driverId: sale.driverId,
      driverName: sale.driver?.name || null,
    }));

    return { success: true, sales: formattedSales };
  } catch (error: any) {
    console.error('Error fetching available deliveries:', error);
    return { success: false, error: error.message, sales: [] };
  }
}
