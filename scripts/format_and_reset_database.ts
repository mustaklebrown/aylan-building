import 'dotenv/config';
import { auth } from '../src/lib/auth';
import prisma from '../src/lib/prisma';

async function resetAndFormatDatabase() {
  console.log('================================================================');
  console.log('🧹 FORMATAGE ET RÉINITIALISATION DE LA BASE DE DONNÉES AYLAN');
  console.log('================================================================');

  try {
    // 1. Delete all transactional & relational data
    console.log('\n🗑️ Suppression des données transactionnelles...');
    await prisma.commission.deleteMany({});
    console.log('   ✓ Commissions supprimées');

    await prisma.sale.deleteMany({});
    console.log('   ✓ Ventes et livraisons supprimées');

    await prisma.stockMovement.deleteMany({});
    console.log('   ✓ Mouvements de stock supprimés');

    await prisma.productAssignment.deleteMany({});
    console.log('   ✓ Assignations de produits supprimées');

    await prisma.prospect.deleteMany({});
    console.log('   ✓ Prospects supprimés');

    await prisma.notification.deleteMany({});
    console.log('   ✓ Notifications supprimées');

    await prisma.auditLog.deleteMany({});
    console.log('   ✓ Logs d\'audit supprimés');

    await prisma.product.deleteMany({});
    console.log('   ✓ Anciens produits supprimés');

    // 2. Define the exact list of principal users to keep
    const principalUsers = [
      {
        email: 'admin@aylan.com',
        name: 'Admin Principal',
        role: 'ADMIN',
      },
      {
        email: 'stockiste@aylan.com',
        name: 'Stockiste Central (M. Oussama)',
        role: 'STOCKISTE',
      },
      {
        email: 'ecom@aylan.com',
        name: 'E-commerçant Alpha (Boutique)',
        role: 'ECOMMERCANT',
      },
      {
        email: 'leader@aylan.com',
        name: 'Leader Aylan (Équipe Nord)',
        role: 'LEADER',
      },
      {
        email: 'agent@aylan.com',
        name: 'Téléconseiller Ahmed',
        role: 'AGENT',
        leaderEmail: 'leader@aylan.com',
      },
      {
        email: 'accountant@aylan.com',
        name: 'Comptable Global',
        role: 'ACCOUNTANT',
      },
      {
        email: 'delivery@aylan.com',
        name: 'Assistant Direction Livraison',
        role: 'DELIVERY_ASSISTANT',
      },
      {
        email: 'driver@aylan.com',
        name: 'Livreur Moroni',
        role: 'DELIVERY',
      },
    ];

    const principalEmails = principalUsers.map((u) => u.email.toLowerCase());

    // 3. Delete extra/test users not in the principal list
    console.log('\n👥 Nettoyage des utilisateurs non principaux...');
    const usersToDelete = await prisma.user.findMany({
      where: {
        email: {
          notIn: principalEmails,
        },
      },
      select: { id: true, email: true },
    });

    for (const u of usersToDelete) {
      // Delete sessions and accounts
      await prisma.session.deleteMany({ where: { userId: u.id } });
      await prisma.account.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
      console.log(`   - Utilisateur supprimé : ${u.email}`);
    }
    console.log(`   ✓ ${usersToDelete.length} utilisateur(s) non principaux supprimé(s).`);

    // 4. Ensure principal users exist, have updated profiles, roles, and credentials
    console.log('\n🔑 Configuration des utilisateurs principaux (Mot de passe: password123)...');
    const emailToId: Record<string, string> = {};

    for (const u of principalUsers) {
      let userId = '';
      const existing = await prisma.user.findUnique({
        where: { email: u.email },
      });

      if (existing) {
        userId = existing.id;
        await prisma.user.update({
          where: { id: userId },
          data: {
            name: u.name,
            role: u.role,
            isAvailable: u.role === 'DELIVERY' ? true : false,
            leaderId: null, // will be linked in pass 2
          },
        });
        console.log(`   ✓ [Existant] ${u.role.padEnd(18)} : ${u.email}`);
      } else {
        try {
          const res = await auth.api.signUpEmail({
            body: {
              email: u.email,
              password: 'password123',
              name: u.name,
            },
          });
          if (res?.user) {
            userId = res.user.id;
            await prisma.user.update({
              where: { id: userId },
              data: {
                role: u.role,
                isAvailable: u.role === 'DELIVERY' ? true : false,
              },
            });
            console.log(`   ✓ [Créé] ${u.role.padEnd(18)} : ${u.email}`);
          }
        } catch (e: any) {
          console.error(`   ⚠️ Erreur création ${u.email}:`, e.message);
        }
      }

      if (userId) {
        emailToId[u.email] = userId;
      }
    }

    // 5. Link agent to leader
    if (emailToId['agent@aylan.com'] && emailToId['leader@aylan.com']) {
      await prisma.user.update({
        where: { id: emailToId['agent@aylan.com'] },
        data: { leaderId: emailToId['leader@aylan.com'] },
      });
      console.log('   ✓ Téléconseiller (agent@aylan.com) rattaché au Leader (leader@aylan.com)');
    }

    // 6. Seed clean initial products catalogue owned by Stockiste
    console.log('\n📦 Initialisation du catalogue produits propre...');
    const stockisteId = emailToId['stockiste@aylan.com'];

    const initialProducts = [
      {
        name: 'Pack Énergie Solaire 100W',
        sku: 'SOL-100W-01',
        category: 'Énergie & Maison',
        description: 'Panneau photovoltaïque haute efficacité avec contrôleur de charge inclus.',
        purchasePrice: 25000,
        salePrice: 45000,
        agentCommission: 3000,
        ecommercantCommission: 6000,
        leaderCommission: 1500,
        stockAvailable: 50,
        alertThreshold: 5,
        stockisteId: stockisteId,
        allowAllEcommercants: true,
        allowAllLeaders: true,
        isActive: true,
      },
      {
        name: 'Kit Domotique & Sécurité Caméra HD',
        sku: 'SEC-CAM-HD',
        category: 'Sécurité & High-Tech',
        description: 'Caméra connectée rotative avec vision nocturne et détection intelligente.',
        purchasePrice: 15000,
        salePrice: 29000,
        agentCommission: 2500,
        ecommercantCommission: 4500,
        leaderCommission: 1000,
        stockAvailable: 30,
        alertThreshold: 5,
        stockisteId: stockisteId,
        allowAllEcommercants: true,
        allowAllLeaders: true,
        isActive: true,
      },
      {
        name: 'Ventilateur Rechargeable Solaire 16"',
        sku: 'VENT-SOL-16',
        category: 'Maison & Confort',
        description: 'Ventilateur puissant avec batterie intégrée 12h d\'autonomie et port USB.',
        purchasePrice: 18000,
        salePrice: 32000,
        agentCommission: 2000,
        ecommercantCommission: 4000,
        leaderCommission: 1000,
        stockAvailable: 40,
        alertThreshold: 8,
        stockisteId: stockisteId,
        allowAllEcommercants: true,
        allowAllLeaders: true,
        isActive: true,
      },
    ];

    for (const prod of initialProducts) {
      const created = await prisma.product.create({
        data: prod,
      });
      console.log(`   ✓ Produit ajouté : ${created.name} (${created.stockAvailable} en stock)`);
    }

    console.log('\n================================================================');
    console.log('✅ BASE DE DONNÉES RÉINITIALISÉE AVEC SUCCÈS !');
    console.log('================================================================');
    console.log('\n📋 IDENTIFIANTS PRINCIPAUX DISPONIBLES :');
    console.log('----------------------------------------------------------------');
    console.log('Mot de passe universel : password123');
    console.log('----------------------------------------------------------------');
    console.log('• Administrateur  : admin@aylan.com');
    console.log('• Stockiste       : stockiste@aylan.com');
    console.log('• E-commerçant    : ecom@aylan.com');
    console.log('• Téléconseiller  : agent@aylan.com');
    console.log('• Leader          : leader@aylan.com');
    console.log('• Comptable       : accountant@aylan.com');
    console.log('• Livreur         : driver@aylan.com');
    console.log('• Assistant Livr. : delivery@aylan.com');
    console.log('================================================================\n');
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndFormatDatabase();
