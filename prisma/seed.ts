import 'dotenv/config';
import { auth } from '../src/lib/auth';
import prisma from '../src/lib/prisma';

async function seed() {
  try {
    const users = [
      { email: 'admin@aylan.com', name: 'Admin Principal', role: 'ADMIN' },
      { email: 'accountant@aylan.com', name: 'Comptable Global', role: 'ACCOUNTANT' },
      { email: 'stockiste@aylan.com', name: 'Stockiste Central (M. Oussama)', role: 'STOCKISTE' },
      { email: 'leader@aylan.com', name: 'Leader Aylan (Équipe Nord)', role: 'LEADER' },
      {
        email: 'agent@aylan.com',
        name: 'Téléconseiller Ahmed',
        role: 'AGENT',
        leaderEmail: 'leader@aylan.com',
      },
      {
        email: 'ecom@aylan.com',
        name: 'E-commerçant Alpha (Boutique Express)',
        role: 'ECOMMERCANT',
      },
      {
        email: 'delivery@aylan.com',
        name: 'Assistant Direction Livraison',
        role: 'DELIVERY_ASSISTANT',
      },
      { email: 'driver@aylan.com', name: 'Livreur Moroni Centre', role: 'DELIVERY' },
    ];

    // First pass: create all users and update roles
    const emailToId: Record<string, string> = {};

    for (const u of users) {
      console.log(`Seeding ${u.role} (${u.email})...`);
      let userId = '';
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
        }
      } catch (e) {
        console.log(
          `${u.role} (${u.email}) already exists or signUp failed. Checking DB...`,
        );
        const existing = await prisma.user.findFirst({
          where: { email: u.email },
        });
        if (existing) {
          userId = existing.id;
        }
      }

      if (userId) {
        const updateData: any = { role: u.role };
        if (u.role === 'DELIVERY') {
          updateData.isAvailable = true;
        }
        await prisma.user.update({
          where: { id: userId },
          data: updateData,
        });
        emailToId[u.email] = userId;
        console.log(`${u.role} (${u.email}) seeded/updated.`);
      }
    }

    // Second pass: associate agents to leaders
    for (const u of users) {
      if ('leaderEmail' in u && u.leaderEmail) {
        const agentId = emailToId[u.email];
        const leaderId = emailToId[u.leaderEmail];
        if (agentId && leaderId) {
          await prisma.user.update({
            where: { id: agentId },
            data: { leaderId },
          });
          console.log(`Associated agent ${u.email} to leader ${u.leaderEmail}`);
        }
      }
    }

    // Third pass: Seed sample products with Stockiste ownership and multi-tier commissions
    const stockisteId = emailToId['stockiste@aylan.com'];
    if (stockisteId) {
      const sampleProducts = [
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
          stockAvailable: 35,
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
          stockAvailable: 20,
          alertThreshold: 3,
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
          stockAvailable: 45,
          alertThreshold: 10,
          stockisteId: stockisteId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
      ];

      for (const prod of sampleProducts) {
        const existing = await prisma.product.findUnique({
          where: { sku: prod.sku },
        });
        if (!existing) {
          await prisma.product.create({
            data: prod,
          });
          console.log(`Product created: ${prod.name} (Stockiste: ${stockisteId})`);
        } else {
          await prisma.product.update({
            where: { sku: prod.sku },
            data: {
              stockisteId: prod.stockisteId,
              agentCommission: prod.agentCommission,
              ecommercantCommission: prod.ecommercantCommission,
              leaderCommission: prod.leaderCommission,
            },
          });
          console.log(`Product updated: ${prod.name}`);
        }
      }
    }

    console.log('All seeded successfully.');
  } catch (e) {
    console.error('Error seeding:', e);
  }
}

seed();
