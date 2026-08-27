import dotenv from 'dotenv';
import './_shared/guardSensitiveRead.mjs';
dotenv.config({ path: 'backend/.env' });

import prisma from '../src/config/prisma.js';

async function main() {
  const restaurant = await prisma.restaurant.findFirst({
    select: { id: true, slug: true, name: true },
    orderBy: { id: 'asc' },
  });

  console.log(JSON.stringify(restaurant, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
