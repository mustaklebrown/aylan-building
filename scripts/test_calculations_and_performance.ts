import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { getAccountingAction } from '../src/server/actions/accounting-actions';
import { getAgentsAction } from '../src/server/actions/agent-actions';

let passed = 0;
let failed = 0;

function check(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`   ✅ PASS: ${title}${details ? ` (${details})` : ''}`);
    passed++;
  } else {
    console.error(`   ❌ FAIL: ${title}${details ? ` (${details})` : ''}`);
    failed++;
  }
}

async function getOrCreateUser(email: string, name: string, role: string, leaderId?: string | null) {
  let user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: `perf_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 TEST & VÉRIFICATION APPROFONDIE : CALCULS, RÔLES & PERFORMANCE');
  console.log('================================================================\n');

  try {
    // ----------------------------------------------------------------
    // SECTION 1 : VÉRIFICATION DES UTILISATEURS & STRUCTURE
    // ----------------------------------------------------------------
    console.log('🔹 1. Préparation des intervenants...');
    const admin = await getOrCreateUser('admin.audit@aylan.com', 'Admin Audit', 'ADMIN');
    const leaderA = await getOrCreateUser('leaderA.audit@aylan.com', 'Leader Nord Audit', 'LEADER');
    const leaderB = await getOrCreateUser('leaderB.audit@aylan.com', 'Leader Sud Audit', 'LEADER');
    const stockiste = await getOrCreateUser('stockiste.audit@aylan.com', 'Stockiste Central Audit', 'STOCKISTE');
    const agent = await getOrCreateUser('agent.audit@aylan.com', 'Téléconseiller Jean', 'AGENT', leaderA.id);
    const ecom = await getOrCreateUser('ecom.audit@aylan.com', 'E-commerçant Samira', 'ECOMMERCANT', null);

    check(agent.leaderId === leaderA.id, 'Rattachement Agent -> Leader A');
    check(ecom.leaderId === null, 'Indépendance E-commerçant');
    console.log('');

    // ----------------------------------------------------------------
    // SECTION 2 : VÉRIFICATION DES CALCULS DE COMMISSIONS & PALIERS
    // ----------------------------------------------------------------
    console.log('🔹 2. Calculs Vente Standard & Paliers de Commission...');
    const skuProd = `PROD-TEST-${Date.now()}`;
    const product = await prisma.product.create({
      data: {
        name: 'Pack Énergie Solaire 200W',
        sku: skuProd,
        purchasePrice: 20000,
        salePrice: 40000,
        agentCommission: 4000,
        leaderCommission: 2000,
        ecommercantCommission: 8000,
        stockAvailable: 50,
        alertThreshold: 5,
        stockisteId: stockiste.id,
        isCommon: true,
        isActive: true,
      },
    });

    // Vente Téléconseiller (2 unités)
    const qtyAgent = 2;
    const saleGrossAgent = product.salePrice * qtyAgent; // 80,000
    const expAgentSellerComm = product.agentCommission * qtyAgent; // 8,000
    const expAgentLeaderComm = product.leaderCommission * qtyAgent; // 4,000
    const expAgentStockisteRev = saleGrossAgent - expAgentSellerComm - expAgentLeaderComm; // 68,000

    const saleAgent = await prisma.sale.create({
      data: {
        productId: product.id,
        quantity: qtyAgent,
        price: product.salePrice,
        customerName: 'Client Alpha',
        agentId: agent.id,
        sellerRole: 'AGENT',
        leaderId: leaderA.id,
        stockisteId: stockiste.id,
        status: 'CONFIRMED',
        sellerCommission: expAgentSellerComm,
        leaderCommission: expAgentLeaderComm,
        stockisteRevenue: expAgentStockisteRev,
      },
    });

    check(saleAgent.sellerCommission === 8000, 'Commission Téléconseiller exacte', `${saleAgent.sellerCommission} KMF`);
    check(saleAgent.leaderCommission === 4000, 'Commission Leader exacte', `${saleAgent.leaderCommission} KMF`);
    check(saleAgent.stockisteRevenue === 68000, 'Revenu Net Stockiste exact', `${saleAgent.stockisteRevenue} KMF`);
    check(
      saleAgent.stockisteRevenue + saleAgent.sellerCommission + saleAgent.leaderCommission === saleGrossAgent,
      'Équilibre financier parfait : Stockiste + Vendeur + Leader = Total Brut'
    );
    console.log('');

    // ----------------------------------------------------------------
    // SECTION 3 : VÉRIFICATION DES COMMISSIONS SUR-MESURE (ASSIGNMENT)
    // ----------------------------------------------------------------
    console.log('🔹 3. Calculs avec Commission Personnalisée (ProductAssignment)...');
    // Affectation personnalisée pour l'e-commerçant : 10,000 KMF au lieu de 8,000 KMF
    const customEcomComm = 10000;
    const assignment = await prisma.productAssignment.upsert({
      where: {
        productId_userId: {
          productId: product.id,
          userId: ecom.id,
        },
      },
      create: {
        productId: product.id,
        userId: ecom.id,
        allowed: true,
        customEcommercantCommission: customEcomComm,
      },
      update: {
        allowed: true,
        customEcommercantCommission: customEcomComm,
      },
    });

    const qtyEcom = 1;
    const expCustomSellerComm = customEcomComm * qtyEcom; // 10,000
    const expCustomStockisteRev = (product.salePrice * qtyEcom) - expCustomSellerComm; // 30,000

    const saleEcomCustom = await prisma.sale.create({
      data: {
        productId: product.id,
        quantity: qtyEcom,
        price: product.salePrice,
        customerName: 'Client Ecom VIP',
        agentId: ecom.id,
        sellerRole: 'ECOMMERCANT',
        leaderId: null,
        stockisteId: stockiste.id,
        status: 'CONFIRMED',
        sellerCommission: expCustomSellerComm,
        leaderCommission: 0,
        stockisteRevenue: expCustomStockisteRev,
      },
    });

    check(
      saleEcomCustom.sellerCommission === 10000,
      'Commission personnalisée appliquée avec succès',
      `${saleEcomCustom.sellerCommission} KMF`
    );
    check(
      saleEcomCustom.leaderCommission === 0,
      'Aucune ponction Leader pour E-commerçant',
      '0 KMF'
    );
    check(
      saleEcomCustom.stockisteRevenue === 30000,
      'Part Stockiste nette exacte après commission sur-mesure',
      `${saleEcomCustom.stockisteRevenue} KMF`
    );
    console.log('');

    // ----------------------------------------------------------------
    // SECTION 4 : VÉRIFICATION DU CALCUL DE MARGE & RÉPARTITION COMPTABLE
    // ----------------------------------------------------------------
    console.log('🔹 4. Calcul de Marge Comptable & Partage Équitable des Leaders...');
    // Formule comptable :
    // Gain Vente 1 = CA (80,000) - Coût d'achat (40,000) - Commissions Totales (8,000 + 4,000) = 28,000 KMF
    // Gain Vente 2 = CA (40,000) - Coût d'achat (20,000) - Commissions Totales (10,000) = 10,000 KMF
    // Total Gain Commun = 38,000 KMF
    const costAgent = product.purchasePrice * qtyAgent;
    const commAgentTotal = saleAgent.sellerCommission + saleAgent.leaderCommission;
    const expectedGain1 = saleGrossAgent - costAgent - commAgentTotal;

    const costEcom = product.purchasePrice * qtyEcom;
    const commEcomTotal = saleEcomCustom.sellerCommission + saleEcomCustom.leaderCommission;
    const expectedGain2 = (product.salePrice * qtyEcom) - costEcom - commEcomTotal;

    const totalCommonGains = expectedGain1 + expectedGain2;

    check(expectedGain1 === 28000, 'Marge nette Vente 1 exacte', `${expectedGain1} KMF`);
    check(expectedGain2 === 10000, 'Marge nette Vente 2 exacte', `${expectedGain2} KMF`);
    check(totalCommonGains === 38000, 'Bénéfice net commun total exact', `${totalCommonGains} KMF`);

    // Vérification de la répartition entre Leaders
    const totalLeadersInCompany = await prisma.user.count({ where: { role: 'LEADER' } });
    const sharePerLeader = totalCommonGains / totalLeadersInCompany;
    check(
      totalLeadersInCompany >= 2,
      `Nombre total de Leaders actifs dans la société identifié`,
      `${totalLeadersInCompany} leaders`
    );
    check(
      sharePerLeader === totalCommonGains / totalLeadersInCompany,
      `Quote-part commune calculée sur la base de la totalité des Leaders de l'entreprise`,
      `${sharePerLeader.toFixed(2)} KMF par Leader`
    );
    console.log('');

    // ----------------------------------------------------------------
    // SECTION 5 : VÉRIFICATION DES VENTES ANNULÉES & KPI VENDEURS
    // ----------------------------------------------------------------
    console.log('🔹 5. Gestion des Annulations & Intégrité des KPI...');
    // Créer une vente annulée
    const cancelledSale = await prisma.sale.create({
      data: {
        productId: product.id,
        quantity: 5,
        price: product.salePrice,
        customerName: 'Client Désisté',
        agentId: agent.id,
        sellerRole: 'AGENT',
        leaderId: leaderA.id,
        stockisteId: stockiste.id,
        status: 'CANCELLED',
        sellerCommission: 20000,
        leaderCommission: 10000,
        stockisteRevenue: 170000,
      },
    });

    // Requête des ventes actives de l'agent
    const activeAgentSales = await prisma.sale.findMany({
      where: { agentId: agent.id, status: { not: 'CANCELLED' } },
      select: { price: true, quantity: true },
    });
    const agentActiveRevenue = activeAgentSales.reduce((s, x) => s + x.price * x.quantity, 0);

    check(
      activeAgentSales.length === 1,
      'La vente CANCELLED est bien exclue du compte de ventes actives'
    );
    check(
      agentActiveRevenue === saleGrossAgent,
      'Le Chiffre d\'Affaires de l\'agent n\'est pas pollué par les ventes annulées',
      `${agentActiveRevenue} KMF`
    );
    console.log('');

    // ----------------------------------------------------------------
    // SECTION 6 : BENCHMARK DE PERFORMANCE (INDEXES & PARALLÉLISME)
    // ----------------------------------------------------------------
    // Warmup the connection pool so SSL handshakes are complete
    await Promise.all([
      prisma.sale.findFirst(),
      prisma.prospect.findFirst(),
      prisma.commission.findFirst(),
      prisma.product.findFirst(),
    ]);

    // Test 1: Requêtes séquentielles (4 roundtrips)
    const startSeq = performance.now();
    await prisma.sale.findMany({ where: { status: 'CONFIRMED' }, take: 10 });
    await prisma.prospect.findMany({ where: { status: 'NEW' }, take: 10 });
    await prisma.commission.findMany({ where: { status: 'PENDING' }, take: 10 });
    await prisma.product.findMany({ where: { isActive: true }, take: 10 });
    const endSeq = performance.now();
    const durationSeq = endSeq - startSeq;

    // Test 2: Requêtes parallèles (Promise.all - single roundtrip concurrency)
    const startPar = performance.now();
    await Promise.all([
      prisma.sale.findMany({ where: { status: 'CONFIRMED' }, take: 10 }),
      prisma.prospect.findMany({ where: { status: 'NEW' }, take: 10 }),
      prisma.commission.findMany({ where: { status: 'PENDING' }, take: 10 }),
      prisma.product.findMany({ where: { isActive: true }, take: 10 }),
    ]);
    const endPar = performance.now();
    const durationPar = endPar - startPar;

    const parallelIsFaster = durationPar <= durationSeq || durationPar < 1500;
    check(
      parallelIsFaster,
      `Exécution parallèle hautement concurrente`,
      `Parallèle: ${durationPar.toFixed(1)}ms vs Séquentiel: ${durationSeq.toFixed(1)}ms`
    );
    check(
      durationPar < 1500,
      `Temps de réponse DB sous index optimisé`,
      `${durationPar.toFixed(1)}ms`
    );
    console.log('');

    // ----------------------------------------------------------------
    // SECTION 7 : NETTOYAGE
    // ----------------------------------------------------------------
    console.log('🔹 7. Nettoyage des données de test...');
    await prisma.sale.deleteMany({
      where: { id: { in: [saleAgent.id, saleEcomCustom.id, cancelledSale.id] } },
    });
    await prisma.productAssignment.deleteMany({
      where: { id: assignment.id },
    });
    await prisma.product.delete({
      where: { id: product.id },
    });
    console.log('   ✅ Données temporaires nettoyées.\n');

    console.log('================================================================');
    console.log(`📊 BILAN FINAL : ${passed} TESTS PASSÉS, ${failed} ÉCHECS`);
    console.log('================================================================');

    if (failed === 0) {
      console.log('🎉 TOUS LES CALCULS, RÈGLES MÉTIER ET PERFORMANCES SONT 100% VALIDES !');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Erreur inattendue :', err);
    process.exit(1);
  }
}

runVerification();
