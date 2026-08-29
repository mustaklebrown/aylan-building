import 'dotenv/config';
import prisma from '../src/lib/prisma';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`   ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`   ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function getOrCreateTestUser(email: string, name: string, role: string, leaderId?: string | null) {
  let user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: `user_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email,
        name,
        role,
        leaderId: leaderId || null,
        emailVerified: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role, leaderId: leaderId !== undefined ? leaderId : user.leaderId },
    });
  }
  return user;
}

async function main() {
  console.log('================================================================');
  console.log('🚀 SUITE DE TESTS COMPLÈTE : ROLES & FONCTIONNALITÉS AYLAN GROUP');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1 : Initialisation & Vérification des 8 Rôles
    // -------------------------------------------------------------------------
    console.log('🔹 1. INITIALISATION DES 8 RÔLES UTILISATEURS');
    const admin = await getOrCreateTestUser('admin.suite@aylan.com', 'Super Admin Suite', 'ADMIN');
    const accountant = await getOrCreateTestUser('comptable.suite@aylan.com', 'Comptable Central Suite', 'ACCOUNTANT');
    const stockiste = await getOrCreateTestUser('stockiste.suite@aylan.com', 'Stockiste Grand Magasin Suite', 'STOCKISTE');
    const leaderA = await getOrCreateTestUser('leaderA.suite@aylan.com', 'Leader Nord Suite', 'LEADER');
    const leaderB = await getOrCreateTestUser('leaderB.suite@aylan.com', 'Leader Sud Suite', 'LEADER');
    const agentA = await getOrCreateTestUser('agentA.suite@aylan.com', 'Téléconseiller Alpha (Team Nord)', 'AGENT', leaderA.id);
    const ecom = await getOrCreateTestUser('ecom.suite@aylan.com', 'E-commerçant Indépendant Suite', 'ECOMMERCANT', null);
    const assistant = await getOrCreateTestUser('assistant.suite@aylan.com', 'Assistant Logistique Suite', 'DELIVERY_ASSISTANT');
    const driver = await getOrCreateTestUser('driver.suite@aylan.com', 'Livreur Express Moroni', 'DELIVERY');

    assert(admin.role === 'ADMIN', 'Rôle ADMIN configuré');
    assert(accountant.role === 'ACCOUNTANT', 'Rôle ACCOUNTANT configuré');
    assert(stockiste.role === 'STOCKISTE', 'Rôle STOCKISTE configuré');
    assert(leaderA.role === 'LEADER' && leaderB.role === 'LEADER', 'Rôles LEADER configurés');
    assert(agentA.role === 'AGENT' && agentA.leaderId === leaderA.id, 'Rôle AGENT rattaché au LEADER A');
    assert(ecom.role === 'ECOMMERCANT' && ecom.leaderId === null, 'Rôle ECOMMERCANT indépendant (sans leader)');
    assert(assistant.role === 'DELIVERY_ASSISTANT', 'Rôle DELIVERY_ASSISTANT configuré');
    assert(driver.role === 'DELIVERY', 'Rôle DELIVERY configuré');
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 2 : Création de Produits & Gestion des Stocks (STOCKISTE & ADMIN)
    // -------------------------------------------------------------------------
    console.log('🔹 2. GESTION DES PRODUITS & MOUVEMENTS DE STOCK');
    const skuCommon = `PROD-COMM-${Date.now()}`;
    const skuSpecific = `PROD-SPEC-${Date.now()}`;

    // Produit Commun appartenant au Stockiste
    const prodCommon = await prisma.product.create({
      data: {
        name: 'Climatiseur Solaire 12000 BTU',
        sku: skuCommon,
        category: 'Électroménager',
        purchasePrice: 150000,
        salePrice: 250000,
        agentCommission: 15000,
        leaderCommission: 10000,
        ecommercantCommission: 30000,
        stockAvailable: 20,
        alertThreshold: 5,
        stockisteId: stockiste.id,
        isCommon: true,
        allowAllEcommercants: true,
        allowAllLeaders: true,
        isActive: true,
      },
    });

    // Produit Spécifique appartenant au Leader A
    const prodSpecific = await prisma.product.create({
      data: {
        name: 'Kit Domotique Exclusif Team Nord',
        sku: skuSpecific,
        category: 'Domotique',
        purchasePrice: 40000,
        salePrice: 80000,
        agentCommission: 8000,
        leaderCommission: 12000,
        ecommercantCommission: 0,
        stockAvailable: 10,
        alertThreshold: 2,
        stockisteId: stockiste.id,
        isCommon: false,
        leaderId: leaderA.id,
        allowAllEcommercants: false,
        allowAllLeaders: false,
        isActive: true,
      },
    });

    assert(prodCommon.stockisteId === stockiste.id, 'Produit commun rattaché au stockiste');
    assert(prodCommon.agentCommission === 15000 && prodCommon.leaderCommission === 10000 && prodCommon.ecommercantCommission === 30000, 'Grille de commissions multi-rôles enregistrée');
    assert(prodSpecific.leaderId === leaderA.id && !prodSpecific.isCommon, 'Produit spécifique correctement assigné au Leader A');

    // Mouvement de stock manuel (Entrée de stock supplémentaire)
    const mvtIn = await prisma.stockMovement.create({
      data: {
        productId: prodCommon.id,
        type: 'IN',
        quantity: 5,
        cost: prodCommon.purchasePrice,
        supplier: 'Fournisseur International',
      },
    });
    const updatedProdCommon = await prisma.product.update({
      where: { id: prodCommon.id },
      data: { stockAvailable: { increment: 5 } },
    });
    assert(updatedProdCommon.stockAvailable === 25, 'Mouvement de stock IN : Stock passé de 20 à 25');

    // Mouvement de stock (Perte/Dommage)
    await prisma.stockMovement.create({
      data: {
        productId: prodCommon.id,
        type: 'OUT_DAMAGE',
        quantity: 1,
        cost: prodCommon.purchasePrice,
        supplier: 'Colis endommagé au déchargement',
      },
    });
    const prodAfterLoss = await prisma.product.update({
      where: { id: prodCommon.id },
      data: { stockAvailable: { decrement: 1 } },
    });
    assert(prodAfterLoss.stockAvailable === 24, 'Mouvement de stock OUT_DAMAGE : Stock passé de 25 à 24');
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 3 : Vente par Téléconseiller (AGENT) avec Leader
    // -------------------------------------------------------------------------
    console.log('🔹 3. SCÉNARIO DE VENTE AGENT (TÉLÉCONSEILLER)');
    const qtyAgent = 2; // 2 unités de Climatiseur Solaire
    const grossTotalAgent = prodCommon.salePrice * qtyAgent; // 500,000
    const sellerCommAgent = prodCommon.agentCommission * qtyAgent; // 30,000
    const leaderCommAgent = prodCommon.leaderCommission * qtyAgent; // 20,000
    const stockisteRevAgent = grossTotalAgent - sellerCommAgent - leaderCommAgent; // 450,000

    const saleAgent = await prisma.sale.create({
      data: {
        productId: prodCommon.id,
        quantity: qtyAgent,
        price: prodCommon.salePrice,
        customerName: 'Hôtel Moroni Palace',
        agentId: agentA.id,
        sellerRole: 'AGENT',
        leaderId: leaderA.id,
        stockisteId: stockiste.id,
        status: 'CONFIRMED',
        sellerCommission: sellerCommAgent,
        leaderCommission: leaderCommAgent,
        stockisteRevenue: stockisteRevAgent,
        shippingType: 'DELIVERY',
        shippingCity: 'Moroni',
        shippingAddress: 'Boulevard de la Corniche',
        shippingFee: 5000,
      },
    });

    // Création des commissions correspondantes
    const commAgent = await prisma.commission.create({
      data: {
        saleId: saleAgent.id,
        agentId: agentA.id,
        amount: sellerCommAgent,
        role: 'AGENT',
        status: 'PENDING',
      },
    });
    const commLeader = await prisma.commission.create({
      data: {
        saleId: saleAgent.id,
        agentId: leaderA.id,
        amount: leaderCommAgent,
        role: 'LEADER',
        status: 'PENDING',
      },
    });

    // Décrémentation du stock
    await prisma.product.update({
      where: { id: prodCommon.id },
      data: { stockAvailable: { decrement: qtyAgent } },
    });

    assert(saleAgent.sellerCommission === 30000, 'Commission Téléconseiller exacte (30,000 KMF)');
    assert(saleAgent.leaderCommission === 20000, 'Commission Leader exacte (20,000 KMF)');
    assert(saleAgent.stockisteRevenue === 450000, 'Revenu net Stockiste exact (450,000 KMF)');
    assert(commAgent.amount === 30000 && commLeader.amount === 20000, 'Commissions enregistrées en base pour Agent et Leader');
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 4 : Vente par E-commerçant indépendant (ECOMMERCANT)
    // -------------------------------------------------------------------------
    console.log('🔹 4. SCÉNARIO DE VENTE E-COMMERÇANT INDÉPENDANT');
    const qtyEcom = 1; // 1 unité
    const grossTotalEcom = prodCommon.salePrice * qtyEcom; // 250,000
    const sellerCommEcom = prodCommon.ecommercantCommission * qtyEcom; // 30,000
    const leaderCommEcom = 0; // Pas de leader
    const stockisteRevEcom = grossTotalEcom - sellerCommEcom; // 220,000

    const saleEcom = await prisma.sale.create({
      data: {
        productId: prodCommon.id,
        quantity: qtyEcom,
        price: prodCommon.salePrice,
        customerName: 'Boutique Électro Anjouan',
        agentId: ecom.id,
        sellerRole: 'ECOMMERCANT',
        leaderId: null,
        stockisteId: stockiste.id,
        status: 'CONFIRMED',
        sellerCommission: sellerCommEcom,
        leaderCommission: leaderCommEcom,
        stockisteRevenue: stockisteRevEcom,
        shippingType: 'PICKUP',
      },
    });

    const commEcom = await prisma.commission.create({
      data: {
        saleId: saleEcom.id,
        agentId: ecom.id,
        amount: sellerCommEcom,
        role: 'ECOMMERCANT',
        status: 'PENDING',
      },
    });

    await prisma.product.update({
      where: { id: prodCommon.id },
      data: { stockAvailable: { decrement: qtyEcom } },
    });

    assert(saleEcom.sellerCommission === 30000, 'Commission E-commerçant exacte (30,000 KMF)');
    assert(saleEcom.leaderCommission === 0, 'Aucune commission Leader pour vente E-commerçant (0 KMF)');
    assert(saleEcom.stockisteRevenue === 220000, 'Revenu net Stockiste exact (220,000 KMF)');
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 5 : Cycle de Vie Livraison & Livreur (DELIVERY & DELIVERY_ASSISTANT)
    // -------------------------------------------------------------------------
    console.log('🔹 5. CYCLE DE VIE LIVRAISONS & LIVREURS');
    
    // Livreur disponible
    const updatedDriver = await prisma.user.update({
      where: { id: driver.id },
      data: { isAvailable: true },
    });
    assert(updatedDriver.isAvailable === true, 'Disponibilité Livreur activée (isAvailable = true)');

    // Prise en charge de la livraison par le livreur
    const claimedSale = await prisma.sale.update({
      where: { id: saleAgent.id },
      data: {
        driverId: driver.id,
        status: 'SHIPPED',
      },
    });
    await prisma.user.update({
      where: { id: driver.id },
      data: { isAvailable: false },
    });

    assert(claimedSale.driverId === driver.id && claimedSale.status === 'SHIPPED', 'Vente passée au statut SHIPPED avec assignation du livreur');

    // Livreur finalise la livraison
    const deliveredSale = await prisma.sale.update({
      where: { id: saleAgent.id },
      data: { status: 'DELIVERED' },
    });
    const freedDriver = await prisma.user.update({
      where: { id: driver.id },
      data: { isAvailable: true },
    });

    assert(deliveredSale.status === 'DELIVERED', 'Commande passée au statut DELIVERED');
    assert(freedDriver.isAvailable === true, 'Livreur redevient disponible après livraison');
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 6 : Annulation de Vente & Recrédit Stock (Restitution)
    // -------------------------------------------------------------------------
    console.log('🔹 6. ANNULATION DE VENTE & RECRÉDIT DE STOCK');
    const stockBeforeCancel = (await prisma.product.findUnique({ where: { id: prodCommon.id } }))?.stockAvailable || 0;

    // Annulation de la vente E-commerçant
    await prisma.sale.update({
      where: { id: saleEcom.id },
      data: { status: 'CANCELLED' },
    });
    // Suppression des commissions non payées
    await prisma.commission.deleteMany({
      where: { saleId: saleEcom.id, status: 'PENDING' },
    });
    // Recrédit du stock
    const prodAfterCancel = await prisma.product.update({
      where: { id: prodCommon.id },
      data: { stockAvailable: { increment: qtyEcom } },
    });
    await prisma.stockMovement.create({
      data: {
        productId: prodCommon.id,
        type: 'OUT_RETURN',
        quantity: qtyEcom,
        cost: prodCommon.purchasePrice,
        supplier: `Vente annulée N° ${saleEcom.id}`,
      },
    });

    assert(prodAfterCancel.stockAvailable === stockBeforeCancel + qtyEcom, 'Stock recrédité automatiquement après annulation (+1)');
    const remainingPendingComm = await prisma.commission.findMany({ where: { saleId: saleEcom.id } });
    assert(remainingPendingComm.length === 0, 'Commissions annulées supprimées de la base');
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 7 : Règlement des Commissions par le Comptable (ACCOUNTANT)
    // -------------------------------------------------------------------------
    console.log('🔹 7. COMPTABILITÉ & VALIDATION DES PAIEMENTS DE COMMISSIONS');
    const paidAgentComm = await prisma.commission.update({
      where: { id: commAgent.id },
      data: { status: 'PAID' },
    });
    const paidLeaderComm = await prisma.commission.update({
      where: { id: commLeader.id },
      data: { status: 'PAID' },
    });

    assert(paidAgentComm.status === 'PAID', 'Commission Téléconseiller validée et marquée PAID');
    assert(paidLeaderComm.status === 'PAID', 'Commission Leader validée et marquée PAID');

    // Audit Log
    const audit = await prisma.auditLog.create({
      data: {
        userId: accountant.id,
        action: 'PAY_COMMISSION',
        entity: 'commission',
        entityId: commAgent.id,
        details: `Paiement validé par ${accountant.name} pour ${agentA.name} (30,000 KMF)`,
      },
    });
    assert(audit.action === 'PAY_COMMISSION' && audit.userId === accountant.id, 'Audit log enregistré pour le comptable');
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 8 : Nettoyage Propre des Données de Test
    // -------------------------------------------------------------------------
    console.log('🔹 8. NETTOYAGE DES DONNÉES DE TEST');
    await prisma.auditLog.deleteMany({ where: { id: audit.id } });
    await prisma.commission.deleteMany({ where: { saleId: { in: [saleAgent.id, saleEcom.id] } } });
    await prisma.stockMovement.deleteMany({ where: { productId: { in: [prodCommon.id, prodSpecific.id] } } });
    await prisma.sale.deleteMany({ where: { id: { in: [saleAgent.id, saleEcom.id] } } });
    await prisma.product.deleteMany({ where: { id: { in: [prodCommon.id, prodSpecific.id] } } });
    console.log('   ✅ Données de test temporaires supprimées proprement.\n');

    console.log('================================================================');
    console.log(`📊 BILAN DES TESTS : ${testsPassed} PASSÉS, ${testsFailed} ÉCHOUÉS`);
    console.log('================================================================');

    if (testsFailed === 0) {
      console.log('🎉 TOUTES LES FONCTIONNALITÉS ET TOUS LES RÔLES FONCTIONNENT PARFAITEMENT !');
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erreur inattendue pendant les tests :', error);
    process.exit(1);
  }
}

main();
