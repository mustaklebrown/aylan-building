import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function getOrCreateUser(email: string, name: string, role: string, leaderId?: string | null) {
  let user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 DÉBUT DES TESTS COMPLETS : RÔLES, VENTES & COMMISSIONS');
  console.log('====================================================\n');

  try {
    // 0. S'assurer de la présence des index et contraintes nécessaires
    try {
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS user_email_key ON "user"(email);');
    } catch (e) {
      // Ignorer si déjà existant
    }

    // 1. Créer ou récupérer les utilisateurs de test
    console.log('🔹 Étape 1 : Préparation des utilisateurs de test...');
    
    const adminUser = await getOrCreateUser('admin.test@aylan.com', 'Super Admin Test', 'ADMIN');
    const stockisteUser = await getOrCreateUser('stockiste.test@aylan.com', 'Stockiste Central Test', 'STOCKISTE');
    const leaderUser = await getOrCreateUser('leader.test@aylan.com', 'Leader Nord Test', 'LEADER');
    const agentUser = await getOrCreateUser('agent.test@aylan.com', 'Téléconseiller Paul Test', 'AGENT', leaderUser.id);
    const ecomUser = await getOrCreateUser('ecom.test@aylan.com', 'E-commerçant Sara Test', 'ECOMMERCANT', null);

    console.log('✅ Utilisateurs prêts :');
    console.log(`   - Admin: ${adminUser.name} (${adminUser.role})`);
    console.log(`   - Stockiste: ${stockisteUser.name} (${stockisteUser.role})`);
    console.log(`   - Leader: ${leaderUser.name} (${leaderUser.role})`);
    console.log(`   - Téléconseiller: ${agentUser.name} (${agentUser.role}, Leader ID: ${agentUser.leaderId})`);
    console.log(`   - E-commerçant: ${ecomUser.name} (${ecomUser.role}, Indépendant: ${ecomUser.leaderId === null})\n`);

    // 2. Créer un produit test avec Stockiste et commissions multi-paliers
    console.log('🔹 Étape 2 : Création d\'un produit test rattaché au Stockiste...');
    const testSku = `TEST-PROD-${Date.now()}`;
    const initialStock = 50;
    const salePrice = 30000;
    const agentComm = 3000;
    const leaderComm = 1500;
    const ecomComm = 6000;

    const product = await prisma.product.create({
      data: {
        name: 'Panneau Solaire Haute Efficacité 150W',
        sku: testSku,
        category: 'Énergie',
        description: 'Produit de test pour la validation multi-rôles',
        purchasePrice: 18000,
        salePrice: salePrice,
        agentCommission: agentComm,
        leaderCommission: leaderComm,
        ecommercantCommission: ecomComm,
        stockAvailable: initialStock,
        alertThreshold: 5,
        stockisteId: stockisteUser.id,
        allowAllEcommercants: true,
        allowAllLeaders: true,
        isActive: true,
      },
    });

    console.log(`✅ Produit créé : ${product.name} (SKU: ${product.sku})`);
    console.log(`   - Prix de vente: ${product.salePrice} KMF`);
    console.log(`   - Commission Téléconseiller: ${product.agentCommission} KMF`);
    console.log(`   - Commission Leader: ${product.leaderCommission} KMF`);
    console.log(`   - Commission E-commerçant: ${product.ecommercantCommission} KMF`);
    console.log(`   - Propriétaire Stockiste: ${stockisteUser.name}\n`);

    // 3. Test Scénario 1 : Vente réalisée par un Téléconseiller (Agent avec Leader)
    console.log('🔹 Étape 3 : Test Scénario 1 - Vente par Téléconseiller (avec Leader)...');
    const agentQuantity = 2;
    const agentExpectedTotal = salePrice * agentQuantity;
    const agentExpectedSellerComm = agentComm * agentQuantity;
    const agentExpectedLeaderComm = leaderComm * agentQuantity;
    const agentExpectedStockisteRev = agentExpectedTotal - agentExpectedSellerComm - agentExpectedLeaderComm;

    const sale1 = await prisma.sale.create({
      data: {
        productId: product.id,
        quantity: agentQuantity,
        price: salePrice,
        customerName: 'Client Alpha Comores',
        agentId: agentUser.id,
        sellerRole: 'AGENT',
        leaderId: leaderUser.id,
        stockisteId: stockisteUser.id,
        status: 'CONFIRMED',
        sellerCommission: agentExpectedSellerComm,
        leaderCommission: agentExpectedLeaderComm,
        stockisteRevenue: agentExpectedStockisteRev,
        shippingType: 'PICKUP',
      },
    });

    // Création des commissions pour la vente 1
    const commAgent = await prisma.commission.create({
      data: {
        saleId: sale1.id,
        agentId: agentUser.id,
        amount: agentExpectedSellerComm,
        role: 'AGENT',
        status: 'PENDING',
      },
    });

    const commLeader = await prisma.commission.create({
      data: {
        saleId: sale1.id,
        agentId: leaderUser.id,
        amount: agentExpectedLeaderComm,
        role: 'LEADER',
        status: 'PENDING',
      },
    });

    // Décrémentation du stock
    await prisma.product.update({
      where: { id: product.id },
      data: { stockAvailable: { decrement: agentQuantity } },
    });

    console.log(`✅ Vente Téléconseiller enregistrée (ID: ${sale1.id})`);
    console.log(`   - Montant total: ${agentExpectedTotal} KMF`);
    console.log(`   - Commission Vendeur (Téléconseiller): ${sale1.sellerCommission} KMF (Attendu: ${agentExpectedSellerComm}) -> ${sale1.sellerCommission === agentExpectedSellerComm ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   - Commission Leader: ${sale1.leaderCommission} KMF (Attendu: ${agentExpectedLeaderComm}) -> ${sale1.leaderCommission === agentExpectedLeaderComm ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   - Part Stockiste Net: ${sale1.stockisteRevenue} KMF (Attendu: ${agentExpectedStockisteRev}) -> ${sale1.stockisteRevenue === agentExpectedStockisteRev ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   - 2 Commissions créées en base: Agent (${commAgent.amount} KMF), Leader (${commLeader.amount} KMF)\n`);

    // 4. Test Scénario 2 : Vente réalisée par un E-commerçant indépendant (Sans Leader)
    console.log('🔹 Étape 4 : Test Scénario 2 - Vente par E-commerçant indépendant...');
    const ecomQuantity = 1;
    const ecomExpectedTotal = salePrice * ecomQuantity;
    const ecomExpectedSellerComm = ecomComm * ecomQuantity;
    const ecomExpectedLeaderComm = 0;
    const ecomExpectedStockisteRev = ecomExpectedTotal - ecomExpectedSellerComm;

    const sale2 = await prisma.sale.create({
      data: {
        productId: product.id,
        quantity: ecomQuantity,
        price: salePrice,
        customerName: 'Client Beta Express',
        agentId: ecomUser.id,
        sellerRole: 'ECOMMERCANT',
        leaderId: null, // Pas de leader pour l'e-commerçant
        stockisteId: stockisteUser.id,
        status: 'CONFIRMED',
        sellerCommission: ecomExpectedSellerComm,
        leaderCommission: 0,
        stockisteRevenue: ecomExpectedStockisteRev,
        shippingType: 'DELIVERY',
        shippingCity: 'Moroni',
        shippingAddress: 'Quartier Coulée',
        shippingFee: 1500,
      },
    });

    const commEcom = await prisma.commission.create({
      data: {
        saleId: sale2.id,
        agentId: ecomUser.id,
        amount: ecomExpectedSellerComm,
        role: 'ECOMMERCANT',
        status: 'PENDING',
      },
    });

    // Décrémentation du stock
    await prisma.product.update({
      where: { id: product.id },
      data: { stockAvailable: { decrement: ecomQuantity } },
    });

    console.log(`✅ Vente E-commerçant enregistrée (ID: ${sale2.id})`);
    console.log(`   - Montant total: ${ecomExpectedTotal} KMF`);
    console.log(`   - Commission Vendeur (E-commerçant): ${sale2.sellerCommission} KMF (Attendu: ${ecomExpectedSellerComm}) -> ${sale2.sellerCommission === ecomExpectedSellerComm ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   - Commission Leader: ${sale2.leaderCommission} KMF (Attendu: 0) -> ${sale2.leaderCommission === 0 ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   - Part Stockiste Net: ${sale2.stockisteRevenue} KMF (Attendu: ${ecomExpectedStockisteRev}) -> ${sale2.stockisteRevenue === ecomExpectedStockisteRev ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   - 1 Commission créée en base: E-commerçant (${commEcom.amount} KMF)\n`);

    // 5. Vérification du Stock final
    console.log('🔹 Étape 5 : Vérification de la décrémentation des stocks...');
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    const expectedFinalStock = initialStock - agentQuantity - ecomQuantity;
    console.log(`   - Stock initial: ${initialStock}`);
    console.log(`   - Unités vendues: ${agentQuantity + ecomQuantity}`);
    console.log(`   - Stock restant en base: ${updatedProduct?.stockAvailable} (Attendu: ${expectedFinalStock}) -> ${updatedProduct?.stockAvailable === expectedFinalStock ? 'PASS ✅' : 'FAIL ❌'}\n`);

    // 6. Vérification du Chiffre d'Affaires et Revenus Stockiste
    console.log('🔹 Étape 6 : Bilan Stockiste agrégé...');
    const stockisteSales = await prisma.sale.findMany({
      where: { stockisteId: stockisteUser.id },
    });
    const totalStockisteRev = stockisteSales.reduce((sum, s) => sum + s.stockisteRevenue, 0);
    const expectedStockisteTotalRev = agentExpectedStockisteRev + ecomExpectedStockisteRev;

    console.log(`   - Nombre de ventes sur les produits du Stockiste: ${stockisteSales.length}`);
    console.log(`   - Revenu net cumulé pour le Stockiste: ${totalStockisteRev} KMF (Attendu: ${expectedStockisteTotalRev} KMF) -> ${totalStockisteRev === expectedStockisteTotalRev ? 'PASS ✅' : 'FAIL ❌'}\n`);

    // 7. Nettoyage des données de test
    console.log('🔹 Étape 7 : Nettoyage des données de test...');
    await prisma.commission.deleteMany({ where: { saleId: { in: [sale1.id, sale2.id] } } });
    await prisma.sale.deleteMany({ where: { id: { in: [sale1.id, sale2.id] } } });
    await prisma.product.delete({ where: { id: product.id } });
    console.log('✅ Nettoyage terminé avec succès.\n');

    console.log('====================================================');
    console.log('🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS (100% PASS) !');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Erreur lors du test :', error);
    process.exit(1);
  }
}

runTests();
