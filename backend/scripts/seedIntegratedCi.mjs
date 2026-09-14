import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const databaseUrl = String(process.env.CI_INTEGRATION_OWNER_DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('CI_INTEGRATION_OWNER_DATABASE_URL is required.');
const parsed = new URL(databaseUrl);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || !parsed.pathname.toLowerCase().includes('ci')) {
  throw new Error('Integrated CI fixture is restricted to a local disposable CI database.');
}
if (process.env.NODE_ENV !== 'test') throw new Error('Integrated CI fixture requires NODE_ENV=test.');

const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
const password = 'CiJourney123!';
const slugs = ['integrated-ci-a', 'integrated-ci-b'];
const emails = {
  attendantA: 'attendant-a-integrated-ci@example.test',
  kitchenA: 'kitchen-a-integrated-ci@example.test',
  attendantB: 'attendant-b-integrated-ci@example.test',
};

async function removeExistingRestaurant(slug) {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return;
  await prisma.order.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.user.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.product.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.category.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.restaurantSettings.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.subscription.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.invoice.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.restaurant.delete({ where: { id: restaurant.id } });
}

async function createRestaurant(slug, suffix) {
  const restaurant = await prisma.restaurant.create({
    data: {
      name: `Integrated CI Restaurant ${suffix}`,
      slug,
      email: `restaurant-${suffix.toLowerCase()}-integrated-ci@example.test`,
      active: true,
    },
  });
  await prisma.subscription.create({
    data: {
      restaurantId: restaurant.id,
      plan: 'PREMIUM',
      status: 'ATIVA',
      currentPeriodStart: new Date(Date.now() - 86_400_000),
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
    },
  });
  await prisma.restaurantSettings.create({
    data: { restaurantId: restaurant.id, soundNotifications: false },
  });
  return restaurant;
}

async function createStaff({ restaurantId, email, name, subRole, hash }) {
  return prisma.user.create({
    data: {
      restaurantId,
      name,
      email,
      password: hash,
      role: 'FUNCIONARIO',
      subRole,
      active: true,
    },
  });
}

try {
  for (const slug of slugs) await removeExistingRestaurant(slug);
  await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });

  const hash = await bcrypt.hash(password, 10);
  const restaurantA = await createRestaurant(slugs[0], 'A');
  const restaurantB = await createRestaurant(slugs[1], 'B');

  const categoryA = await prisma.category.create({
    data: { restaurantId: restaurantA.id, name: 'Integrated CI' },
  });
  const productA = await prisma.product.create({
    data: {
      restaurantId: restaurantA.id,
      categoryId: categoryA.id,
      name: 'Integrated CI Product',
      description: 'Synthetic product used only by disposable integrated CI.',
      price: 25,
      stock: 100,
      active: true,
      saleMode: 'COMPLETE',
    },
  });

  await createStaff({
    restaurantId: restaurantA.id,
    email: emails.attendantA,
    name: 'Integrated CI Attendant A',
    subRole: 'ATENDENTE',
    hash,
  });
  await createStaff({
    restaurantId: restaurantA.id,
    email: emails.kitchenA,
    name: 'Integrated CI Kitchen A',
    subRole: 'COZINHA',
    hash,
  });
  await createStaff({
    restaurantId: restaurantB.id,
    email: emails.attendantB,
    name: 'Integrated CI Attendant B',
    subRole: 'ATENDENTE',
    hash,
  });

  process.stdout.write(
    `${JSON.stringify({
      restaurantAId: restaurantA.id,
      restaurantBId: restaurantB.id,
      productAId: productA.id,
      emails,
      password,
    })}\n`,
  );
} finally {
  await prisma.$disconnect();
}
