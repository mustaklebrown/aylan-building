import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Set WebSocket constructor for server/Node.js environment.
// PrismaNeon v7.8+ accepts a PoolConfig directly — it creates the Pool internally.
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const prismaClientSingleton = () => {
  // max: 1 limits to a single WebSocket connection — avoids concurrent connection
  // attempts that may be rate-limited or blocked by the local network.
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
    max: 1,
  });
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
