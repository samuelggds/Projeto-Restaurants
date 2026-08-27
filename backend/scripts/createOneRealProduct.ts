import './_shared/disabledLegacyScript.mjs';
import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../src/config/prisma.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../.env') });

const restaurantId = Number(process.argv[2] || 1);
const productName = process.argv[3] || 'Produto 1 Real';

async function main() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      categories: {
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!restaurant) {
    throw new Error(`Restaurante ${restaurantId} nao encontrado.`);
  }

  const category =
    restaurant.categories[0] ||
    (await prisma.category.create({
      data: {
        name: 'Promocoes',
        active: true,
        restaurantId: restaurant.id,
      },
      select: {
        id: true,
        name: true,
      },
    }));

  const existing = await prisma.product.findFirst({
    where: {
      restaurantId: restaurant.id,
      name: productName,
    },
    select: { id: true },
  });

  const product = existing
    ? await prisma.product.update({
        where: { id: existing.id },
        data: {
          price: 1.0,
          active: true,
          categoryId: category.id,
        },
      })
    : await prisma.product.create({
        data: {
          name: productName,
          description: 'Produto promocional de um real.',
          price: 1.0,
          active: true,
          restaurantId: restaurant.id,
          categoryId: category.id,
        },
      });

  console.log(
    JSON.stringify(
      {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        categoryId: category.id,
        categoryName: category.name,
        productId: product.id,
        productName: product.name,
        price: String(product.price),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
