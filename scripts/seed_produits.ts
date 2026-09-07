import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import prisma from '../src/lib/prisma';

interface RawCommissionItem {
  teleconseiller?: number;
  ecommercant?: number;
  leaders?: number;
}

interface RawProduct {
  non: string;
  prixVente: number;
  prixAchat: number;
  commission: RawCommissionItem[];
}

function normalizeTurkishChars(str: string): string {
  return str.replace(/İ/g, 'I').replace(/ı/g, 'i').trim();
}

function slugifySku(str: string): string {
  return normalizeTurkishChars(str)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatProductName(str: string): string {
  const clean = normalizeTurkishChars(str);
  // Capitalize nicely
  return clean
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function seedProduits() {
  console.log('================================================================');
  console.log('📦 SEED DES PRODUITS DEPUIS produits.js (STOCK: 20 CHAQUE)');
  console.log('================================================================\n');

  try {
    // 1. Read and parse produits.js
    const filePath = path.resolve(process.cwd(), 'produits.js');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Evaluate the array
    const rawData: RawProduct[] = new Function(`return ${fileContent}`)();

    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error('Impossible de lire le tableau de produits dans produits.js');
    }

    console.log(`🔍 ${rawData.length} produits trouvés dans produits.js`);

    // 2. Find default stockiste
    const stockiste = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'STOCKISTE' },
          { email: 'stockiste@aylan.com' },
          { role: 'ADMIN' },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (stockiste) {
      console.log(`👤 Stockiste assigné : ${stockiste.name} (${stockiste.email}) [ID: ${stockiste.id}]`);
    } else {
      console.log('⚠️ Aucun stockiste trouvé, les produits seront créés sans stockisteId.');
    }

    console.log('\n----------------------------------------------------------------');

    const seededList = [];

    for (const item of rawData) {
      const rawName = normalizeTurkishChars(item.non);
      const displayName = formatProductName(item.non);
      const sku = `PROD-${slugifySku(rawName)}`;

      let agentComm = 0;
      let ecomComm = 0;
      let leaderComm = 0;

      if (Array.isArray(item.commission)) {
        for (const comm of item.commission) {
          if (comm.teleconseiller !== undefined) agentComm = Number(comm.teleconseiller);
          if (comm.ecommercant !== undefined) ecomComm = Number(comm.ecommercant);
          if (comm.leaders !== undefined) leaderComm = Number(comm.leaders);
        }
      }

      // Check category
      let category = 'Santé & Hygiène';
      if (rawName.toLowerCase().includes('dentifrice') || rawName.toLowerCase().includes('dentaire')) {
        category = 'Hygiène & Soins Dentaires';
      } else if (rawName.toLowerCase().includes('attote')) {
        category = 'Santé & Bien-être';
      } else if (rawName.toLowerCase().includes('wart')) {
        category = 'Dermatologie & Soins';
      } else if (rawName.toLowerCase().includes('gel')) {
        category = 'Soins Corporels';
      }

      const productData = {
        name: displayName,
        sku,
        category,
        description: `Produit authentique Aylan : ${displayName}. Haute efficacité garantie.`,
        purchasePrice: Number(item.prixAchat),
        salePrice: Number(item.prixVente),
        agentCommission: agentComm,
        ecommercantCommission: ecomComm,
        leaderCommission: leaderComm,
        stockAvailable: 20,
        alertThreshold: 5,
        isActive: true,
        allowAllEcommercants: true,
        allowAllLeaders: true,
        isCommon: true,
        stockisteId: stockiste?.id || null,
      };

      // Upsert product
      const product = await prisma.product.upsert({
        where: { sku },
        update: {
          name: productData.name,
          purchasePrice: productData.purchasePrice,
          salePrice: productData.salePrice,
          agentCommission: productData.agentCommission,
          ecommercantCommission: productData.ecommercantCommission,
          leaderCommission: productData.leaderCommission,
          stockAvailable: 20,
          category: productData.category,
          isActive: true,
          stockisteId: productData.stockisteId,
        },
        create: productData,
      });

      // Record stock movement (IN) of 20
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: 20,
          cost: product.purchasePrice,
          supplier: 'Approvisionnement Initial (produits.js)',
        },
      });

      seededList.push(product);
      console.log(`✅ [${product.sku}] ${product.name}`);
      console.log(`   • Prix Achat: ${product.purchasePrice.toLocaleString()} KMF | Prix Vente: ${product.salePrice.toLocaleString()} KMF`);
      console.log(`   • Comms -> Téléconseiller: ${product.agentCommission} | E-commerçant: ${product.ecommercantCommission} | Leader: ${product.leaderCommission}`);
      console.log(`   • Stock disponible: ${product.stockAvailable} unités (Mouvement IN enregistré)`);
      console.log('----------------------------------------------------------------');
    }

    console.log(`\n🎉 SUCCÈS : ${seededList.length} produits seedés avec un stock de 20 chacun !`);
  } catch (err) {
    console.error('❌ Erreur lors du seed des produits :', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedProduits();
