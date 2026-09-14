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
const email = 'customer-integrated-ci@example.test';
const slug = 'integrated-ci-restaurant';

try {
  const existing = await prisma.restaurant.findUnique({ where: { slug } });
  if (existing) {
    await prisma.order.deleteMany({ where: { restaurantId: existing.id } });
    await prisma.product.deleteMany({ where: { restaurantId: existing.id } });
    await prisma.category.deleteMany({ where: { restaurantId: existing.id } });
    await prisma.restaurantSettings.deleteMany({ where: { restaurantId: existing.id } });
    await prisma.subscription.deleteMany({ where: { restaurantId: existing.id } });
    await prisma.invoice.deleteMany({ where: { restaurantId: existing.id } });
    await prisma.restaurant.delete({ where: { id: existing.id } });
  }
  await prisma.user.deleteMany({ where: { email } });

  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Integrated CI Restaurant',
      slug,
      email: 'restaurant-integrated-ci@example.test',
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
  const category = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: 'Integrated CI' },
  });
  const product = await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: category.id,
      name: 'Integrated CI Product',
      description: 'Synthetic product used only by disposable integrated CI.',
      price: 25,
      stock: 100,
      active: true,
      saleMode: 'COMPLETE',
    },
  });
  const customer = await prisma.user.create({
    data: {
      name: 'Integrated CI Customer',
      email,
      password: await bcrypt.hash(password, 10),
      role: 'CLIENTE',
      active: true,
      restaurantId: null,
    },
  });

  process.stdout.write(
    `${JSON.stringify({
      restaurantId: restaurant.id,
      productId: product.id,
      customerId: customer.id,
      email,
      password,
    })}\n`,
  );
} finally {
  await prisma.$disconnect();
}
