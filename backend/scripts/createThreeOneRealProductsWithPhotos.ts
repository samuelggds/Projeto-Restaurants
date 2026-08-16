import 'dotenv/config';
import prisma from '../src/config/prisma.js';

const restaurantSlug = String(process.argv[2] || 'northpizza')
  .trim()
  .toLowerCase();

const productSpecs = [
  {
    name: 'Combo 1 Real 01',
    description: 'Promocao especial de 1 real - unidade 01.',
    image:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Combo 1 Real 02',
    description: 'Promocao especial de 1 real - unidade 02.',
    image:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Combo 1 Real 03',
    description: 'Promocao especial de 1 real - unidade 03.',
    image:
      'https://images.unsplash.com/photo-1548365328-9f547fb0953b?auto=format&fit=crop&w=1200&q=80',
  },
];

async function resolveCategory(restaurantId: number) {
  const existing = await prisma.category.findFirst({
    where: {
      restaurantId,
      active: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.category.create({
    data: {
      restaurantId,
      name: 'Promocoes',
      active: true,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

async function main() {
  if (!restaurantSlug) {
    throw new Error('Informe um slug valido do restaurante.');
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      slug: {
        equals: restaurantSlug,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!restaurant) {
    throw new Error(`Restaurante com slug '${restaurantSlug}' nao encontrado.`);
  }

  const category = await resolveCategory(restaurant.id);

  const results: Array<{
    id: number;
    name: string;
    action: 'created' | 'updated';
    price: string;
    image: string | null;
  }> = [];

  for (const spec of productSpecs) {
    const existing = await prisma.product.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: spec.name,
      },
      select: {
        id: true,
      },
    });

    const payload = {
      name: spec.name,
      description: spec.description,
      image: spec.image,
      price: 1,
      active: true,
      restaurantId: restaurant.id,
      categoryId: category.id,
    };

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: payload,
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
          },
        })
      : await prisma.product.create({
          data: payload,
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
          },
        });

    results.push({
      id: product.id,
      name: product.name,
      action: existing ? 'updated' : 'created',
      price: String(product.price),
      image: product.image,
    });
  }

  console.log(
    JSON.stringify(
      {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
        },
        category,
        products: results,
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
