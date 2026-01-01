import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');

async function main() {
  console.log('🌱 Seed: démarrage ...');

  // 1) CITIES
  const cityNames = [
    'Casablanca',
    'Rabat',
    'Marrakech',
    'Tanger',
    'Agadir',
    'Fes',
    'Kenitra',
    'Oujda',
    'Meknes',
    'Tetouan',
    'Essaouira',
  ];
  const cities = await Promise.all(
    cityNames.map((name) => {
      const id = slugify(name);
      return prisma.city.upsert({
        where: { id },
        update: { name, isActive: true },
        create: { id, name, isActive: true },
      });
    }),
  );
  console.log(`🏙️  Villes synchronisées: ${cities.length}`);

  // 2) CATEGORIES / SERVICES TYPES
  const categories = [
    { id: 'plomberie', name: 'Plomberie' },
    { id: 'electricite', name: 'Electricite' },
    { id: 'menage', name: 'Menage' },
    { id: 'peinture', name: 'Peinture' },
    { id: 'maconnerie', name: 'Maconnerie' },
    { id: 'jardinage', name: 'Jardinage' },
    { id: 'climatisation', name: 'Climatisation' },
    { id: 'menuiserie', name: 'Menuiserie' },
    { id: 'nettoyage', name: 'Nettoyage industriel' },
    { id: 'depannage', name: 'Depannage' },
  ];
  await Promise.all(
    categories.map((cat) =>
      prisma.serviceCategory.upsert({
        where: { id: cat.id },
        update: { name: cat.name, isActive: true, icon: 'Wrench' },
        create: { ...cat, isActive: true, icon: 'Wrench' },
      }),
    ),
  );
  console.log(`🗂️  Catégories synchronisées: ${categories.length}`);

  // 3) USERS / PROS
  const passwordRaw = 'password123';
  const passwordHash = await bcrypt.hash(passwordRaw, 10);

  type ProSeed = {
    slug: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    profession: string;
    cityId: string;
    isVerifiedPro?: boolean;
    isPremium?: boolean;
    averageRating?: number;
    totalReviews?: number;
    services: {
      id: string;
      categoryId: string;
      cityId: string;
      basePrice: number;
      minPrice?: number;
      maxPrice?: number;
      description: string;
    }[];
  };

  const pros: ProSeed[] = [
    {
      slug: 'youssef-el-idrissi',
      email: 'pro.youssef@test.com',
      phone: '+212600000101',
      firstName: 'Youssef',
      lastName: 'El Idrissi',
      profession: 'Plombier',
      cityId: 'casablanca',
      isVerifiedPro: true,
      isPremium: true,
      averageRating: 4.8,
      totalReviews: 120,
      services: [
        {
          id: 'svc-plomberie-casa-youssef',
          categoryId: 'plomberie',
          cityId: 'casablanca',
          basePrice: 250,
          minPrice: 200,
          maxPrice: 600,
          description: 'Plomberie générale et urgences 24/7 à Casablanca',
        },
        {
          id: 'svc-clim-casa-youssef',
          categoryId: 'climatisation',
          cityId: 'casablanca',
          basePrice: 450,
          minPrice: 400,
          maxPrice: 900,
          description: 'Installation et entretien climatisation',
        },
      ],
    },
    {
      slug: 'amina-benhadi',
      email: 'pro.amina@test.com',
      phone: '+212600000102',
      firstName: 'Amina',
      lastName: 'Benhadi',
      profession: 'Electricienne',
      cityId: 'rabat',
      isVerifiedPro: true,
      isPremium: false,
      averageRating: 4.6,
      totalReviews: 85,
      services: [
        {
          id: 'svc-electricite-rabat-amina',
          categoryId: 'electricite',
          cityId: 'rabat',
          basePrice: 300,
          minPrice: 250,
          maxPrice: 700,
          description: 'Mises aux normes et installations électriques',
        },
        {
          id: 'svc-depannage-rabat-amina',
          categoryId: 'depannage',
          cityId: 'rabat',
          basePrice: 200,
          minPrice: 150,
          maxPrice: 500,
          description: 'Dépannage rapide à domicile',
        },
      ],
    },
    {
      slug: 'salma-ait-lahcen',
      email: 'pro.salma@test.com',
      phone: '+212600000103',
      firstName: 'Salma',
      lastName: 'Ait Lahcen',
      profession: 'Peintre',
      cityId: 'marrakech',
      isVerifiedPro: true,
      isPremium: false,
      averageRating: 4.2,
      totalReviews: 60,
      services: [
        {
          id: 'svc-peinture-marrakech-salma',
          categoryId: 'peinture',
          cityId: 'marrakech',
          basePrice: 180,
          minPrice: 150,
          maxPrice: 450,
          description: 'Peinture intérieure et décoration',
        },
        {
          id: 'svc-maconnerie-marrakech-salma',
          categoryId: 'maconnerie',
          cityId: 'marrakech',
          basePrice: 400,
          minPrice: 350,
          maxPrice: 900,
          description: 'Rénovation et maçonnerie légère',
        },
      ],
    },
    {
      slug: 'adil-boulahdour',
      email: 'pro.adil@test.com',
      phone: '+212600000104',
      firstName: 'Adil',
      lastName: 'Boulahdour',
      profession: 'Technicien multi-services',
      cityId: 'tanger',
      isVerifiedPro: false,
      isPremium: false,
      averageRating: 3.9,
      totalReviews: 40,
      services: [
        {
          id: 'svc-plomberie-tanger-adil',
          categoryId: 'plomberie',
          cityId: 'tanger',
          basePrice: 200,
          minPrice: 150,
          maxPrice: 450,
          description: 'Plomberie et débouchage',
        },
        {
          id: 'svc-electricite-tanger-adil',
          categoryId: 'electricite',
          cityId: 'tanger',
          basePrice: 220,
          minPrice: 180,
          maxPrice: 500,
          description: 'Interventions électriques courantes',
        },
      ],
    },
    {
      slug: 'imane-gharbi',
      email: 'pro.imane@test.com',
      phone: '+212600000105',
      firstName: 'Imane',
      lastName: 'Gharbi',
      profession: 'Nettoyage',
      cityId: 'agadir',
      isVerifiedPro: true,
      isPremium: true,
      averageRating: 4.7,
      totalReviews: 95,
      services: [
        {
          id: 'svc-menage-agadir-imane',
          categoryId: 'menage',
          cityId: 'agadir',
          basePrice: 160,
          minPrice: 120,
          maxPrice: 320,
          description: 'Ménage régulier et grand nettoyage',
        },
        {
          id: 'svc-nettoyage-agadir-imane',
          categoryId: 'nettoyage',
          cityId: 'agadir',
          basePrice: 300,
          minPrice: 250,
          maxPrice: 700,
          description: 'Nettoyage industriel et bureaux',
        },
      ],
    },
    {
      slug: 'mehdi-zaoui',
      email: 'pro.mehdi@test.com',
      phone: '+212600000106',
      firstName: 'Mehdi',
      lastName: 'Zaoui',
      profession: 'Menuisier',
      cityId: 'fes',
      isVerifiedPro: false,
      isPremium: true,
      averageRating: 4.5,
      totalReviews: 70,
      services: [
        {
          id: 'svc-menuiserie-fes-mehdi',
          categoryId: 'menuiserie',
          cityId: 'fes',
          basePrice: 350,
          minPrice: 300,
          maxPrice: 800,
          description: 'Menuiserie bois et agencement sur mesure',
        },
        {
          id: 'svc-peinture-fes-mehdi',
          categoryId: 'peinture',
          cityId: 'fes',
          basePrice: 190,
          minPrice: 160,
          maxPrice: 500,
          description: 'Peinture intérieure',
        },
      ],
    },
    {
      slug: 'sara-khalil',
      email: 'pro.sara@test.com',
      phone: '+212600000107',
      firstName: 'Sara',
      lastName: 'Khalil',
      profession: 'Jardinage',
      cityId: 'kenitra',
      isVerifiedPro: true,
      isPremium: false,
      averageRating: 4.4,
      totalReviews: 55,
      services: [
        {
          id: 'svc-jardinage-kenitra-sara',
          categoryId: 'jardinage',
          cityId: 'kenitra',
          basePrice: 220,
          minPrice: 180,
          maxPrice: 520,
          description: 'Entretien jardins et espaces verts',
        },
        {
          id: 'svc-menage-kenitra-sara',
          categoryId: 'menage',
          cityId: 'kenitra',
          basePrice: 150,
          minPrice: 120,
          maxPrice: 320,
          description: 'Ménage à domicile',
        },
      ],
    },
    {
      slug: 'hamza-elalami',
      email: 'pro.hamza@test.com',
      phone: '+212600000108',
      firstName: 'Hamza',
      lastName: 'Elalami',
      profession: 'Technicien clim',
      cityId: 'oujda',
      isVerifiedPro: false,
      isPremium: false,
      averageRating: 3.8,
      totalReviews: 30,
      services: [
        {
          id: 'svc-clim-oujda-hamza',
          categoryId: 'climatisation',
          cityId: 'oujda',
          basePrice: 300,
          minPrice: 250,
          maxPrice: 700,
          description: 'Installation climatisation',
        },
        {
          id: 'svc-depannage-oujda-hamza',
          categoryId: 'depannage',
          cityId: 'oujda',
          basePrice: 180,
          minPrice: 140,
          maxPrice: 420,
          description: 'Dépannage multi-services',
        },
      ],
    },
    {
      slug: 'noura-elmokhtar',
      email: 'pro.noura@test.com',
      phone: '+212600000109',
      firstName: 'Noura',
      lastName: 'Elmokhtar',
      profession: 'Peintre & déco',
      cityId: 'meknes',
      isVerifiedPro: true,
      isPremium: true,
      averageRating: 4.9,
      totalReviews: 140,
      services: [
        {
          id: 'svc-peinture-meknes-noura',
          categoryId: 'peinture',
          cityId: 'meknes',
          basePrice: 210,
          minPrice: 180,
          maxPrice: 520,
          description: 'Peinture et finitions décoratives',
        },
        {
          id: 'svc-maconnerie-meknes-noura',
          categoryId: 'maconnerie',
          cityId: 'meknes',
          basePrice: 420,
          minPrice: 380,
          maxPrice: 950,
          description: 'Rénovation intérieure',
        },
      ],
    },
    {
      slug: 'rachid-lamrani',
      email: 'pro.rachid@test.com',
      phone: '+212600000110',
      firstName: 'Rachid',
      lastName: 'Lamrani',
      profession: 'Plombier',
      cityId: 'tetouan',
      isVerifiedPro: false,
      isPremium: false,
      averageRating: 4.0,
      totalReviews: 45,
      services: [
        {
          id: 'svc-plomberie-tetouan-rachid',
          categoryId: 'plomberie',
          cityId: 'tetouan',
          basePrice: 190,
          minPrice: 150,
          maxPrice: 480,
          description: 'Plomberie domestique',
        },
        {
          id: 'svc-depannage-tetouan-rachid',
          categoryId: 'depannage',
          cityId: 'tetouan',
          basePrice: 170,
          minPrice: 130,
          maxPrice: 420,
          description: 'Dépannage express',
        },
      ],
    },
    {
      slug: 'laila-soufi',
      email: 'pro.laila@test.com',
      phone: '+212600000111',
      firstName: 'Laila',
      lastName: 'Soufi',
      profession: 'Nettoyage',
      cityId: 'essaouira',
      isVerifiedPro: true,
      isPremium: false,
      averageRating: 4.3,
      totalReviews: 65,
      services: [
        {
          id: 'svc-nettoyage-essaouira-laila',
          categoryId: 'nettoyage',
          cityId: 'essaouira',
          basePrice: 260,
          minPrice: 220,
          maxPrice: 600,
          description: 'Nettoyage villas et locaux',
        },
        {
          id: 'svc-menage-essaouira-laila',
          categoryId: 'menage',
          cityId: 'essaouira',
          basePrice: 150,
          minPrice: 120,
          maxPrice: 320,
          description: 'Ménage régulier',
        },
      ],
    },
    {
      slug: 'amin-belhaj',
      email: 'pro.amin@test.com',
      phone: '+212600000112',
      firstName: 'Amin',
      lastName: 'Belhaj',
      profession: 'Menuisier',
      cityId: 'casablanca',
      isVerifiedPro: true,
      isPremium: true,
      averageRating: 4.6,
      totalReviews: 110,
      services: [
        {
          id: 'svc-menuiserie-casa-amin',
          categoryId: 'menuiserie',
          cityId: 'casablanca',
          basePrice: 380,
          minPrice: 320,
          maxPrice: 950,
          description: 'Agencement sur mesure, portes, placards',
        },
        {
          id: 'svc-peinture-casa-amin',
          categoryId: 'peinture',
          cityId: 'casablanca',
          basePrice: 220,
          minPrice: 180,
          maxPrice: 520,
          description: 'Peinture et finitions bois',
        },
      ],
    },
    {
      slug: 'karima-essafi',
      email: 'pro.karima@test.com',
      phone: '+212600000113',
      firstName: 'Karima',
      lastName: 'Essafi',
      profession: 'Jardinage',
      cityId: 'rabat',
      isVerifiedPro: false,
      isPremium: false,
      averageRating: 4.1,
      totalReviews: 35,
      services: [
        {
          id: 'svc-jardinage-rabat-karima',
          categoryId: 'jardinage',
          cityId: 'rabat',
          basePrice: 210,
          minPrice: 170,
          maxPrice: 520,
          description: 'Entretien jardins, arrosage, taille',
        },
        {
          id: 'svc-menage-rabat-karima',
          categoryId: 'menage',
          cityId: 'rabat',
          basePrice: 150,
          minPrice: 120,
          maxPrice: 320,
          description: 'Ménage ponctuel',
        },
      ],
    },
  ];

  for (const pro of pros) {
    const user = await prisma.user.upsert({
      where: { email: pro.email },
      update: {
        passwordHash: passwordHash,
        role: 'PRO',
        phone: pro.phone,
      },
      create: {
        email: pro.email,
        passwordHash: passwordHash,
        role: 'PRO',
        phone: pro.phone,
        isEmailVerified: true,
        proProfile: {
          create: {
            firstName: pro.firstName,
            lastName: pro.lastName,
            profession: pro.profession,
            bio: `${pro.profession} expérimenté`,
            cityId: pro.cityId,
            isVerifiedPro: pro.isVerifiedPro ?? false,
            isPremium: pro.isPremium ?? false,
            averageRating: pro.averageRating,
            totalReviews: pro.totalReviews ?? 0,
          },
        },
      },
    });

    const proProfile = await prisma.proProfile.findUnique({
      where: { userId: user.id },
    });

    if (proProfile) {
      for (const svc of pro.services) {
        const { categoryId, ...svcRest } = svc;
        await prisma.proService.upsert({
          where: { id: svc.id },
          update: {
            ...svcRest,
            serviceCategoryId: categoryId,
            proProfileId: proProfile.id,
            isActive: true,
            updatedAt: new Date(),
          },
          create: {
            ...svcRest,
            serviceCategoryId: categoryId,
            proProfileId: proProfile.id,
            isActive: true,
          },
        });
      }
    }
  }
  console.log(`👷 Pros et services créés: ${pros.length} pros, ${pros.reduce((acc, p) => acc + p.services.length, 0)} services`);

  // 4) CLIENT DEMO
  await prisma.user.upsert({
    where: { email: 'jean.client@test.com' },
    update: {
      passwordHash,
      role: 'CLIENT',
    },
    create: {
      email: 'jean.client@test.com',
      passwordHash,
      role: 'CLIENT',
      phone: '+212600000002',
      isEmailVerified: true,
      clientProfile: {
        create: {
          firstName: 'Jean',
          lastName: 'Dupont',
        },
      },
    },
  });
  console.log('🙋‍♂️ Client de démo créé');

  console.log('✅ Seed terminé avec succès');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
