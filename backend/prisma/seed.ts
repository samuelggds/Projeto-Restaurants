import bcrypt from 'bcrypt';
import { FuncionarioSubRole, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const PASSWORD = '123456';

async function clearDatabase() {
  await prisma.supportChatMessage.deleteMany();
  await prisma.orderIssueThread.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.table.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.restaurantSettings.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.authRefreshSession.deleteMany();
  await prisma.authMfaChallenge.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();
}

async function createUser(data: {
  email: string;
  name: string;
  role: UserRole;
  subRole?: FuncionarioSubRole | null;
  restaurantId?: number | null;
}) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hash,
      role: data.role,
      subRole: data.subRole ?? null,
      active: true,
      restaurantId: data.restaurantId ?? null,
    },
  });
}

async function main() {
  console.log('Limpando banco de dados...');
  await clearDatabase();
  console.log('Banco limpo.\n');

  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Restaurante Demo',
      slug: 'restaurante-demo',
      email: 'contato@demo.com',
      active: true,
    },
  });

  const users = [
    {
      email: 'superadmin@demo.com',
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      subRole: null,
      restaurantId: null,
    },
    {
      email: 'admin@demo.com',
      name: 'Admin',
      role: UserRole.ADMIN,
      subRole: null,
      restaurantId: restaurant.id,
    },
    {
      email: 'cozinha@demo.com',
      name: 'Cozinheiro',
      role: UserRole.FUNCIONARIO,
      subRole: FuncionarioSubRole.COZINHA,
      restaurantId: restaurant.id,
    },
    {
      email: 'garcom@demo.com',
      name: 'Garcom',
      role: UserRole.FUNCIONARIO,
      subRole: FuncionarioSubRole.GARCOM,
      restaurantId: restaurant.id,
    },
    {
      email: 'motoqueiro@demo.com',
      name: 'Motoqueiro',
      role: UserRole.MOTOQUEIRO,
      subRole: null,
      restaurantId: restaurant.id,
    },
    {
      email: 'cliente@demo.com',
      name: 'Cliente',
      role: UserRole.CLIENTE,
      subRole: null,
      restaurantId: null,
    },
  ] as const;

  for (const u of users) {
    await createUser(u);
    const tag = u.subRole ? ` (${u.subRole})` : '';
    console.log(`  ✓ ${u.role}${tag}  ${u.email}  senha: ${PASSWORD}`);
  }

  console.log('\nSeed concluido.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
