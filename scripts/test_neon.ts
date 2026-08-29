import 'dotenv/config';
import { PrismaNeon, PrismaNeonHttp } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

async function testAdapters() {
  console.log('Testing PrismaNeonHttp adapter...');
  try {
    const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {});
    const prisma = new PrismaClient({ adapter });

    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, name: true, email: true, role: true },
    });
    console.log('✅ PrismaNeonHttp Success! Users:', users);

    const productCount = await prisma.product.count();
    console.log('✅ Total Products in DB:', productCount);

    const salesCount = await prisma.sale.count();
    console.log('✅ Total Sales in DB:', salesCount);

    return true;
  } catch (err) {
    console.error('PrismaNeonHttp failed:', err);
    return false;
  }
}

testAdapters();
