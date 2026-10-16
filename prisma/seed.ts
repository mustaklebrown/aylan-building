import 'dotenv/config';
import { auth } from '../src/lib/auth';
import prisma from '../src/lib/prisma';

async function seed() {
  try {
    const users = [
      { email: 'admin@aylan.com', name: 'Admin Principal', role: 'ADMIN' },
      { email: 'accountant@aylan.com', name: 'Comptable Global', role: 'ACCOUNTANT' },
      { email: 'stockiste@aylan.com', name: 'Stockiste Central (M. Oussama)', role: 'STOCKISTE' },
      { email: 'ismat@digecom.com', name: 'Mlle Ismat', role: 'STOCKISTE' },
      { email: 'dalilou@digecom.com', name: 'M. Dalilou', role: 'STOCKISTE' },
      { email: 'bousri@digecom.com', name: 'M. Bousri', role: 'STOCKISTE' },
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
      // 20 E-commerçants Dig e-com
      { email: 'hachemi@digecom.com', name: 'Hachemi Ben Abd Hsn', role: 'ECOMMERCANT', password: 'Hachemi@2026' },
      { email: 'zaym@digecom.com', name: 'ZAYM', role: 'ECOMMERCANT', password: 'Zaym@2026' },
      { email: 'mufti@digecom.com', name: 'mufti', role: 'ECOMMERCANT', password: 'Mufti@2026' },
      { email: 'beniman@digecom.com', name: 'Ben iman', role: 'ECOMMERCANT', password: 'Beniman@2026' },
      { email: 'anicha@digecom.com', name: 'Anicha', role: 'ECOMMERCANT', password: 'Anicha@2026' },
      { email: 'nailati@digecom.com', name: 'Nailati', role: 'ECOMMERCANT', password: 'Nailati@2026' },
      { email: 'natacha@digecom.com', name: 'Natacha', role: 'ECOMMERCANT', password: 'Natacha@2026' },
      { email: 'naira@digecom.com', name: 'Naira', role: 'ECOMMERCANT', password: 'Naira@2026' },
      { email: 'niati@digecom.com', name: 'Niati', role: 'ECOMMERCANT', password: 'Niati@2026' },
      { email: 'nadhra@digecom.com', name: 'Nadhra', role: 'ECOMMERCANT', password: 'Nadhra@2026' },
      { email: 'tanzilou@digecom.com', name: 'Tanzilou', role: 'ECOMMERCANT', password: 'Tanzilou@2026' },
      { email: 'taadhuma@digecom.com', name: 'Taadhuma', role: 'ECOMMERCANT', password: 'Taadhuma@2026' },
      { email: 'thamarati@digecom.com', name: 'Thamarati', role: 'ECOMMERCANT', password: 'Thamarati@2026' },
      { email: 'hachmia@digecom.com', name: 'Hachmia', role: 'ECOMMERCANT', password: 'Hachmia@2026' },
      { email: 'ichati@digecom.com', name: 'ichati', role: 'ECOMMERCANT', password: 'Ichati@2026' },
      { email: 'loutfa@digecom.com', name: 'Loutfa', role: 'ECOMMERCANT', password: 'Loutfa@2026' },
      { email: 'zamzam@digecom.com', name: 'Zamzam', role: 'ECOMMERCANT', password: 'Zamzam@2026' },
      { email: 'zamzam2@digecom.com', name: 'Zamzam2', role: 'ECOMMERCANT', password: 'Zamzam2@2026' },
      { email: 'aicha@digecom.com', name: 'Aïcha', role: 'ECOMMERCANT', password: 'Aicha@2026' },
      { email: 'chamsia@digecom.com', name: 'chamsia', role: 'ECOMMERCANT', password: 'Chamsia@2026' },
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
            password: (u as any).password || 'password123',
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
        // Produits officiels issus de produits.js
        {
          name: 'Dentifrice Longrich Grand',
          sku: 'PROD-DENTIFRICE-LONGRICH-GRAND',
          category: 'Hygiène & Soins Dentaires',
          description: 'Dentifrice multi-effet Longrich grand format pour une protection bucco-dentaire maximale.',
          purchasePrice: 3750,
          salePrice: 10000,
          agentCommission: 2000,
          ecommercantCommission: 2000,
          leaderCommission: 4500,
          stockAvailable: 20,
          alertThreshold: 5,
          stockisteId: stockisteId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Dentifrice Longrich Petit',
          sku: 'PROD-DENTIFRICE-LONGRICH-PETIT',
          category: 'Hygiène & Soins Dentaires',
          description: 'Dentifrice multi-effet Longrich petit format, idéal pour transport et usage quotidien.',
          purchasePrice: 2000,
          salePrice: 7500,
          agentCommission: 1500,
          ecommercantCommission: 1500,
          leaderCommission: 4500,
          stockAvailable: 20,
          alertThreshold: 5,
          stockisteId: stockisteId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Gel Orange',
          sku: 'PROD-GEL-ORANGE',
          category: 'Soins Corporels',
          description: 'Gel corporel rafraîchissant et revitalisant à l\'orange.',
          purchasePrice: 5000,
          salePrice: 12500,
          agentCommission: 2500,
          ecommercantCommission: 7500,
          leaderCommission: 7500,
          stockAvailable: 20,
          alertThreshold: 5,
          stockisteId: stockisteId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Comprime Dentaire',
          sku: 'PROD-COMPRIME-DENTAIRE',
          category: 'Hygiène & Soins Dentaires',
          description: 'Comprimés dentaires effervescents pour hygiène buccale et haleine fraîche.',
          purchasePrice: 5000,
          salePrice: 10000,
          agentCommission: 1500,
          ecommercantCommission: 5000,
          leaderCommission: 5000,
          stockAvailable: 20,
          alertThreshold: 5,
          stockisteId: stockisteId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Tag Wart',
          sku: 'PROD-TAG-WART',
          category: 'Dermatologie & Soins',
          description: 'Soin ciblé haute précision pour verrues et imperfections cutanées.',
          purchasePrice: 5000,
          salePrice: 12500,
          agentCommission: 2500,
          ecommercantCommission: 7500,
          leaderCommission: 7500,
          stockAvailable: 20,
          alertThreshold: 5,
          stockisteId: stockisteId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Attote',
          sku: 'PROD-ATTOTE',
          category: 'Santé & Bien-être',
          description: 'Remède naturel et tonifiant d\'origine traditionnelle de haute renommée.',
          purchasePrice: 12500,
          salePrice: 20000,
          agentCommission: 2500,
          ecommercantCommission: 7500,
          leaderCommission: 7500,
          stockAvailable: 20,
          alertThreshold: 5,
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

    // Fourth pass: Seed products for Stockiste Mlle Ismat
    const ismatId = emailToId['ismat@digecom.com'];
    if (ismatId) {
      const ismatProducts = [
        {
          name: 'Crème funege',
          sku: 'ISMAT-CF-01',
          category: 'Dermatologie & Soins',
          description: 'Crème traitante funege pour soins cutanés ciblés et apaisants.',
          purchasePrice: 2000,
          salePrice: 8500,
          agentCommission: 1500,
          ecommercantCommission: 1500,
          leaderCommission: 1500,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: ismatId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Nutriforce',
          sku: 'ISMAT-NF-01',
          category: 'Santé & Compléments',
          description: 'Complément revitalisant et fortifiant de haute qualité Nutriforce.',
          purchasePrice: 3500,
          salePrice: 12500,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: ismatId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Attote en poudre',
          sku: 'ISMAT-AP-01',
          category: 'Santé & Bien-être',
          description: 'Attote traditionnel naturel sous forme de poudre tonifiante.',
          purchasePrice: 4000,
          salePrice: 15000,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: ismatId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Pistolet jouer',
          sku: 'ISMAT-PJ-01',
          category: 'Jouets & Loisirs',
          description: 'Pistolet jouet interactif pour enfants avec effets ludiques.',
          purchasePrice: 3000,
          salePrice: 10000,
          agentCommission: 2000,
          ecommercantCommission: 2000,
          leaderCommission: 2000,
          stockAvailable: 20,
          alertThreshold: 5,
          stockisteId: ismatId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Crème épilatoire',
          sku: 'ISMAT-CE-01',
          category: 'Cosmétique & Soins',
          description: 'Crème épilatoire douce et rapide pour tous types de peaux.',
          purchasePrice: 2000,
          salePrice: 8000,
          agentCommission: 1500,
          ecommercantCommission: 1500,
          leaderCommission: 1500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: ismatId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Gamme Vitamine C',
          sku: 'ISMAT-GVC-01',
          category: 'Cosmétique & Soins',
          description: 'Gamme complète de soins éclat et anti-taches enrichie à la Vitamine C.',
          purchasePrice: 3500,
          salePrice: 12500,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: ismatId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Gamme Kojic',
          sku: 'ISMAT-GK-01',
          category: 'Cosmétique & Soins',
          description: 'Gamme éclaircissante et unifiante complète à base d\'acide kojique.',
          purchasePrice: 3500,
          salePrice: 12500,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: ismatId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Licorice',
          sku: 'ISMAT-LIC-01',
          category: 'Cosmétique & Soins',
          description: 'Sérum et soin pur extrait de réglisse Licorice pour teint éclatant et anti-imperfections.',
          purchasePrice: 2000,
          salePrice: 8500,
          agentCommission: 1500,
          ecommercantCommission: 1500,
          leaderCommission: 1500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: ismatId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Comprimé dentaire',
          sku: 'ISMAT-CD-01',
          category: 'Hygiène & Soins Dentaires',
          description: 'Comprimés dentaires effervescents pour hygiène buccale complète et haleine fraîche.',
          purchasePrice: 2500,
          salePrice: 11000,
          agentCommission: 2000,
          ecommercantCommission: 2000,
          leaderCommission: 2000,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: ismatId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
      ];

      for (const prod of ismatProducts) {
        const existing = await prisma.product.findUnique({
          where: { sku: prod.sku },
        });
        if (!existing) {
          await prisma.product.create({
            data: prod,
          });
          console.log(`Product created: ${prod.name} (Stockiste Ismat: ${ismatId})`);
        } else {
          await prisma.product.update({
            where: { sku: prod.sku },
            data: {
              name: prod.name,
              category: prod.category,
              description: prod.description,
              purchasePrice: prod.purchasePrice,
              salePrice: prod.salePrice,
              stockisteId: prod.stockisteId,
              agentCommission: prod.agentCommission,
              ecommercantCommission: prod.ecommercantCommission,
              leaderCommission: prod.leaderCommission,
              stockAvailable: prod.stockAvailable,
              alertThreshold: prod.alertThreshold,
              isActive: prod.isActive,
            },
          });
          console.log(`Product updated: ${prod.name}`);
        }
      }
    }

    // Fifth pass: Seed products for Stockiste M. Dalilou
    const dalilouId = emailToId['dalilou@digecom.com'];
    if (dalilouId) {
      const dalilouProducts = [
        {
          name: 'Nutriforce',
          sku: 'DAL-NF-01',
          category: 'Santé & Compléments',
          description: 'Complément alimentaire fortifiant et tonifiant Nutriforce.',
          purchasePrice: 3500,
          salePrice: 12500,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Attote liquide',
          sku: 'DAL-AL-01',
          category: 'Santé & Bien-être',
          description: 'Attote naturel sous forme liquide traditionnelle, haute vitalité.',
          purchasePrice: 4000,
          salePrice: 15000,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Pistolet jouer',
          sku: 'DAL-PJ-01',
          category: 'Jouets & Loisirs',
          description: 'Pistolet jouet enfant ludique et interactif.',
          purchasePrice: 3000,
          salePrice: 10000,
          agentCommission: 2000,
          ecommercantCommission: 2000,
          leaderCommission: 2000,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Pièce emporter',
          sku: 'DAL-PE-01',
          category: 'Maison & Cuisine',
          description: 'Emporte-pièce culinaire pratique pour préparations et pâtisseries.',
          purchasePrice: 1500,
          salePrice: 6000,
          agentCommission: 1000,
          ecommercantCommission: 1000,
          leaderCommission: 1000,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Machine pastel',
          sku: 'DAL-MP-01',
          category: 'Maison & Électroménager',
          description: 'Machine de confection et découpe rapide pour pastels et beignets.',
          purchasePrice: 7500,
          salePrice: 20000,
          agentCommission: 3000,
          ecommercantCommission: 3000,
          leaderCommission: 3000,
          stockAvailable: 20,
          alertThreshold: 3,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Dark knuckle',
          sku: 'DAL-DK-01',
          category: 'Cosmétique & Soins',
          description: 'Soin éclaircissant et unifiant ciblé pour phalanges sombres (Dark Knuckle).',
          purchasePrice: 2000,
          salePrice: 8500,
          agentCommission: 1500,
          ecommercantCommission: 1500,
          leaderCommission: 1500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Machine à sceller',
          sku: 'DAL-MS-01',
          category: 'Maison & Électroménager',
          description: 'Scelleuse thermique compacte pour sachets et emballages hermétiques.',
          purchasePrice: 5000,
          salePrice: 15000,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 20,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Pièce emporté',
          sku: 'DAL-PE-02',
          category: 'Maison & Cuisine',
          description: 'Modèle spécial emporte-pièce de précision pour cuisine.',
          purchasePrice: 2000,
          salePrice: 7500,
          agentCommission: 1500,
          ecommercantCommission: 1500,
          leaderCommission: 1500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Gel orange',
          sku: 'DAL-GO-01',
          category: 'Cosmétique & Soins',
          description: 'Gel revitalisant rafraîchissant corporel à l\'orange.',
          purchasePrice: 4500,
          salePrice: 12500,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Crème épilatoire',
          sku: 'DAL-CE-01',
          category: 'Cosmétique & Soins',
          description: 'Crème épilatoire d\'action rapide pour une peau soyeuse.',
          purchasePrice: 2000,
          salePrice: 8000,
          agentCommission: 1500,
          ecommercantCommission: 1500,
          leaderCommission: 1500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Gamme vitamine c',
          sku: 'DAL-GVC-01',
          category: 'Cosmétique & Soins',
          description: 'Gamme éclat du teint et protection antioxydante à la Vitamine C.',
          purchasePrice: 3500,
          salePrice: 12500,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Hachoir à legume',
          sku: 'DAL-HL-01',
          category: 'Maison & Cuisine',
          description: 'Hachoir manuel et découpe-légumes multifonctions rapide.',
          purchasePrice: 5000,
          salePrice: 15000,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: dalilouId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
      ];

      for (const prod of dalilouProducts) {
        const existing = await prisma.product.findUnique({
          where: { sku: prod.sku },
        });
        if (!existing) {
          await prisma.product.create({
            data: prod,
          });
          console.log(`Product created: ${prod.name} (Stockiste Dalilou: ${dalilouId})`);
        } else {
          await prisma.product.update({
            where: { sku: prod.sku },
            data: {
              name: prod.name,
              category: prod.category,
              description: prod.description,
              purchasePrice: prod.purchasePrice,
              salePrice: prod.salePrice,
              stockisteId: prod.stockisteId,
              agentCommission: prod.agentCommission,
              ecommercantCommission: prod.ecommercantCommission,
              leaderCommission: prod.leaderCommission,
              stockAvailable: prod.stockAvailable,
              alertThreshold: prod.alertThreshold,
              isActive: prod.isActive,
            },
          });
          console.log(`Product updated: ${prod.name}`);
        }
      }
    }

    // Sixth pass: Seed products for Stockiste M. Bousri
    const bousriId = emailToId['bousri@digecom.com'];
    if (bousriId) {
      const bousriProducts = [
        {
          name: 'Gel orange',
          sku: 'BOU-GO-01',
          category: 'Cosmétique & Soins',
          description: 'Gel corporel rafraîchissant et revitalisant à l\'orange.',
          purchasePrice: 4500,
          salePrice: 12500,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Crème moyam',
          sku: 'BOU-CM-01',
          category: 'Cosmétique & Soins',
          description: 'Crème hydratante et nourrissante éclat Moyam pour visage et cou.',
          purchasePrice: 2500,
          salePrice: 9000,
          agentCommission: 1500,
          ecommercantCommission: 1500,
          leaderCommission: 1500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Vital masse',
          sku: 'BOU-VM-01',
          category: 'Santé & Compléments',
          description: 'Complément fortifiant et prise de masse musculaire Vital Masse.',
          purchasePrice: 4000,
          salePrice: 15000,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Sirop BBL',
          sku: 'BOU-SBBL-01',
          category: 'Santé & Beauté',
          description: 'Sirop galbant et tonifiant silhouette BBL aux extraits naturels.',
          purchasePrice: 4500,
          salePrice: 15000,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Masque collagène',
          sku: 'BOU-MC-01',
          category: 'Cosmétique & Soins',
          description: 'Masque visage régénérant et raffermissant au collagène pur.',
          purchasePrice: 2000,
          salePrice: 8000,
          agentCommission: 1500,
          ecommercantCommission: 1500,
          leaderCommission: 1500,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Comprimé dentaire',
          sku: 'BOU-CD-01',
          category: 'Hygiène & Soins Dentaires',
          description: 'Comprimés effervescents pour hygiène dentaire et haleine saine.',
          purchasePrice: 2500,
          salePrice: 11000,
          agentCommission: 2000,
          ecommercantCommission: 2000,
          leaderCommission: 2000,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Huile Ventre plat',
          sku: 'BOU-HVP-01',
          category: 'Santé & Minceur',
          description: 'Huile de massage amincissante et raffermissante ventre plat.',
          purchasePrice: 3000,
          salePrice: 10000,
          agentCommission: 2000,
          ecommercantCommission: 2000,
          leaderCommission: 2000,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Nettoyer et resserrer jessika',
          sku: 'BOU-NRJ-01',
          category: 'Hygiène & Soins Intimes',
          description: 'Soin intime purifiant, apaisant et tonifiant Jessika.',
          purchasePrice: 3000,
          salePrice: 12000,
          agentCommission: 2000,
          ecommercantCommission: 2000,
          leaderCommission: 2000,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Attote liquide',
          sku: 'BOU-AL-01',
          category: 'Santé & Bien-être',
          description: 'Attote liquide traditionnel tonifiant et énergisant.',
          purchasePrice: 4000,
          salePrice: 15000,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Attote poudre',
          sku: 'BOU-AP-01',
          category: 'Santé & Bien-être',
          description: 'Attote 100% naturel en poudre vitalité.',
          purchasePrice: 4000,
          salePrice: 15000,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Crème fessier',
          sku: 'BOU-CF-01',
          category: 'Cosmétique & Soins',
          description: 'Crème raffermissante et galbante pour silhouette harmonieuse.',
          purchasePrice: 3500,
          salePrice: 12500,
          agentCommission: 2500,
          ecommercantCommission: 2500,
          leaderCommission: 2500,
          stockAvailable: 25,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
        {
          name: 'Thé minceur',
          sku: 'BOU-TM-01',
          category: 'Santé & Minceur',
          description: 'Infusion détox minceur drainante et brûle-graisse naturelle.',
          purchasePrice: 2500,
          salePrice: 9000,
          agentCommission: 1500,
          ecommercantCommission: 1500,
          leaderCommission: 1500,
          stockAvailable: 30,
          alertThreshold: 5,
          stockisteId: bousriId,
          allowAllEcommercants: true,
          allowAllLeaders: true,
          isActive: true,
        },
      ];

      for (const prod of bousriProducts) {
        const existing = await prisma.product.findUnique({
          where: { sku: prod.sku },
        });
        if (!existing) {
          await prisma.product.create({
            data: prod,
          });
          console.log(`Product created: ${prod.name} (Stockiste Bousri: ${bousriId})`);
        } else {
          await prisma.product.update({
            where: { sku: prod.sku },
            data: {
              name: prod.name,
              category: prod.category,
              description: prod.description,
              purchasePrice: prod.purchasePrice,
              salePrice: prod.salePrice,
              stockisteId: prod.stockisteId,
              agentCommission: prod.agentCommission,
              ecommercantCommission: prod.ecommercantCommission,
              leaderCommission: prod.leaderCommission,
              stockAvailable: prod.stockAvailable,
              alertThreshold: prod.alertThreshold,
              isActive: prod.isActive,
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
