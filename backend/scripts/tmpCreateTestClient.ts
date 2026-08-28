import './_shared/disabledLegacyScript.mjs';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

import bcrypt from 'bcrypt';
import prisma from '../src/config/prisma.js';
import { UserRole } from '@prisma/client';
import { validatePassword } from '../src/modules/auth/security/passwordPolicy.js';

async function main() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: 'pizza-ia-demo' },
    select: { id: true, slug: true },
  });

  if (!restaurant) {
    throw new Error('Restaurante pizza-ia-demo nao encontrado.');
  }

  const password = 'Teste123!';
  validatePassword(password, 'A senha de teste');
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email: 'cliente.pizzaia.demo@pizzaia.demo' },
    update: {
      name: 'Cliente Pizza IA',
      password: passwordHash,
      role: UserRole.CLIENTE,
      active: true,
      restaurantId: restaurant.id,
      phone: '+5585999998888',
    },
    create: {
      name: 'Cliente Pizza IA',
      email: 'cliente.pizzaia.demo@pizzaia.demo',
      password: passwordHash,
      role: UserRole.CLIENTE,
      active: true,
      restaurantId: restaurant.id,
      phone: '+5585999998888',
    },
    select: { id: true, email: true, role: true, restaurantId: true },
  });

  console.log(JSON.stringify({ user, password }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
