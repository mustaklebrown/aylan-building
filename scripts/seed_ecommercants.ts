import 'dotenv/config';
import { auth } from '../src/lib/auth';
import prisma from '../src/lib/prisma';

export interface EcommercantSeedItem {
  num: number;
  name: string;
  email: string;
  password: string;
  role: string;
}

export const ECOMMERCANTS_LIST: EcommercantSeedItem[] = [
  {
    num: 1,
    name: 'Hachemi Ben Abd Hsn',
    email: 'hachemi@digecom.com',
    password: 'Hachemi@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 2,
    name: 'ZAYM',
    email: 'zaym@digecom.com',
    password: 'Zaym@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 3,
    name: 'mufti',
    email: 'mufti@digecom.com',
    password: 'Mufti@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 4,
    name: 'Ben iman',
    email: 'beniman@digecom.com',
    password: 'Beniman@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 5,
    name: 'Anicha',
    email: 'anicha@digecom.com',
    password: 'Anicha@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 6,
    name: 'Nailati',
    email: 'nailati@digecom.com',
    password: 'Nailati@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 7,
    name: 'Natacha',
    email: 'natacha@digecom.com',
    password: 'Natacha@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 8,
    name: 'Naira',
    email: 'naira@digecom.com',
    password: 'Naira@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 9,
    name: 'Niati',
    email: 'niati@digecom.com',
    password: 'Niati@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 10,
    name: 'Nadhra',
    email: 'nadhra@digecom.com',
    password: 'Nadhra@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 11,
    name: 'Tanzilou',
    email: 'tanzilou@digecom.com',
    password: 'Tanzilou@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 12,
    name: 'Taadhuma',
    email: 'taadhuma@digecom.com',
    password: 'Taadhuma@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 13,
    name: 'Thamarati',
    email: 'thamarati@digecom.com',
    password: 'Thamarati@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 14,
    name: 'Hachmia',
    email: 'hachmia@digecom.com',
    password: 'Hachmia@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 15,
    name: 'ichati',
    email: 'ichati@digecom.com',
    password: 'Ichati@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 16,
    name: 'Loutfa',
    email: 'loutfa@digecom.com',
    password: 'Loutfa@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 17,
    name: 'Zamzam',
    email: 'zamzam@digecom.com',
    password: 'Zamzam@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 18,
    name: 'Zamzam2',
    email: 'zamzam2@digecom.com',
    password: 'Zamzam2@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 20,
    name: 'Aïcha',
    email: 'aicha@digecom.com',
    password: 'Aicha@2026',
    role: 'ECOMMERCANT',
  },
  {
    num: 21,
    name: 'chamsia',
    email: 'chamsia@digecom.com',
    password: 'Chamsia@2026',
    role: 'ECOMMERCANT',
  },
];

async function seedEcommercants() {
  console.log('================================================================');
  console.log('🚀 INITIALISATION DES 20 E-COMMERÇANTS (DIG E-COM)');
  console.log('================================================================\n');

  const createdList: Array<{
    num: number;
    name: string;
    email: string;
    password: string;
    id: string;
    status: string;
  }> = [];

  for (const item of ECOMMERCANTS_LIST) {
    let userId = '';
    let status = 'created';

    // 1. Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: item.email },
    });

    if (existing) {
      userId = existing.id;
      status = 'updated';
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: item.name,
          role: 'ECOMMERCANT',
          leaderId: null,
          isAvailable: false,
        },
      });
      console.log(`[Existant] N°${item.num.toString().padStart(2, ' ')} : ${item.name.padEnd(22)} (${item.email})`);
    } else {
      try {
        const res = await auth.api.signUpEmail({
          body: {
            email: item.email,
            password: item.password,
            name: item.name,
          },
        });

        if (res?.user) {
          userId = res.user.id;
          await prisma.user.update({
            where: { id: userId },
            data: {
              role: 'ECOMMERCANT',
              leaderId: null,
              isAvailable: false,
            },
          });
          console.log(`[Créé]     N°${item.num.toString().padStart(2, ' ')} : ${item.name.padEnd(22)} (${item.email})`);
        }
      } catch (err: any) {
        console.error(`❌ Erreur pour ${item.email}:`, err.message);
        // Fallback: check if created despite error
        const fallback = await prisma.user.findUnique({
          where: { email: item.email },
        });
        if (fallback) {
          userId = fallback.id;
          status = 'fallback_found';
        }
      }
    }

    if (userId) {
      createdList.push({
        num: item.num,
        name: item.name,
        email: item.email,
        password: item.password,
        id: userId,
        status,
      });
    }
  }

  console.log('\n================================================================');
  console.log(`✅ ${createdList.length} / ${ECOMMERCANTS_LIST.length} E-COMMERÇANTS CRÉÉS / MIS À JOUR AVEC SUCCÈS !`);
  console.log('================================================================\n');

  console.log('TABLEAU RÉCAPITULATIF DES IDENTIFIANTS :');
  console.table(
    createdList.map((c) => ({
      'N°': c.num,
      Nom: c.name,
      Email: c.email,
      'Mot de passe': c.password,
      Rôle: 'ECOMMERCANT',
    }))
  );
}

seedEcommercants()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Fatal seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
