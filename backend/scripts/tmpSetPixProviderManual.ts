import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

import prisma from '../src/config/prisma.js';

async function main() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: 'pizza-ia-demo' },
    select: { id: true },
  });

  if (!restaurant) {
    throw new Error('Restaurante pizza-ia-demo nao encontrado.');
  }

  const settings = await prisma.restaurantSettings.update({
    where: { restaurantId: restaurant.id },
    data: {
      pixProvider: 'NUBANK',
      pixKey: 'contato@pizzaia.demo',
    },
    select: {
      restaurantId: true,
      pixProvider: true,
      pixKey: true,
    },
  });

  console.log(JSON.stringify(settings, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
