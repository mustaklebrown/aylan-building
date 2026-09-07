import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function verify() {
  const prods = await prisma.product.findMany({
    select: {
      sku: true,
      name: true,
      salePrice: true,
      purchasePrice: true,
      stockAvailable: true,
      agentCommission: true,
      ecommercantCommission: true,
      leaderCommission: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('\n📊 PRODUITS ACTUELLEMENT EN BASE DE DONNÉES :');
  console.table(prods);
  await prisma.$disconnect();
}

verify();
