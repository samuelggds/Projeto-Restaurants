import prisma from '../src/config/prisma.js';

const restaurantId = Number(process.argv[2] || 15);

const categoriesToCreate = [
  {
    name: 'Bebidas',
    image:
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80',
    products: [
      {
        name: 'Limonada da Casa',
        description: 'Limonada gelada com hortela fresca.',
        price: 12.9,
        image:
          'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Pink Soda Especial',
        description: 'Soda italiana com frutas vermelhas.',
        price: 16.9,
        image:
          'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
  {
    name: 'Sobremesas',
    image:
      'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80',
    products: [
      {
        name: 'Brownie com Sorvete',
        description: 'Brownie quente com sorvete de creme.',
        price: 23.9,
        image:
          'https://images.unsplash.com/photo-1606313564200-e75d5e30476e?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Cheesecake de Frutas Vermelhas',
        description: 'Cheesecake cremoso com calda artesanal.',
        price: 24.9,
        image:
          'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
  {
    name: 'Massas',
    image:
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    products: [
      {
        name: 'Fettuccine Alfredo',
        description: 'Massa artesanal ao molho alfredo e parmesao.',
        price: 41.9,
        image:
          'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Lasanha Bolonhesa',
        description: 'Lasanha de carne com queijo gratinado.',
        price: 44.9,
        image:
          'https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
  {
    name: 'Saladas',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    products: [
      {
        name: 'Salada Caesar',
        description: 'Alface romana, frango grelhado e molho caesar.',
        price: 27.9,
        image:
          'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Salada Tropical',
        description: 'Mix de folhas, manga e molho citrico.',
        price: 26.9,
        image:
          'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
];

async function ensureCategory(restaurant, payload) {
  const existing = await prisma.category.findFirst({
    where: {
      restaurantId: restaurant.id,
      name: payload.name,
    },
  });

  if (existing) {
    const updated = await prisma.category.update({
      where: { id: existing.id },
      data: {
        image: payload.image,
        active: true,
      },
    });

    return { category: updated, created: false };
  }

  const created = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: payload.name,
      image: payload.image,
      active: true,
    },
  });

  return { category: created, created: true };
}

async function ensureProduct(restaurantIdValue, categoryId, payload) {
  const existing = await prisma.product.findFirst({
    where: {
      restaurantId: restaurantIdValue,
      name: payload.name,
    },
    select: { id: true },
  });

  if (existing) {
    return false;
  }

  await prisma.product.create({
    data: {
      name: payload.name,
      description: payload.description,
      image: payload.image,
      price: payload.price,
      active: true,
      restaurantId: restaurantIdValue,
      categoryId,
    },
  });

  return true;
}

async function main() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true },
  });

  if (!restaurant) {
    throw new Error(`Restaurante ${restaurantId} nao encontrado.`);
  }

  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let productsCreated = 0;
  let productsSkipped = 0;

  for (const categoryData of categoriesToCreate) {
    const { category, created } = await ensureCategory(restaurant, categoryData);

    if (created) {
      categoriesCreated += 1;
    } else {
      categoriesUpdated += 1;
    }

    for (const productData of categoryData.products) {
      const inserted = await ensureProduct(restaurant.id, category.id, productData);

      if (inserted) {
        productsCreated += 1;
      } else {
        productsSkipped += 1;
      }
    }
  }

  const totalCategories = await prisma.category.count({
    where: { restaurantId: restaurant.id },
  });

  const totalProducts = await prisma.product.count({
    where: { restaurantId: restaurant.id },
  });

  console.log(
    JSON.stringify(
      {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        categoriesCreated,
        categoriesUpdated,
        productsCreated,
        productsSkipped,
        totalCategories,
        totalProducts,
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
