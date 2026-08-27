import './_shared/disabledLegacyScript.mjs';
import prisma from '../src/config/prisma.js';

const restaurantId = Number(process.argv[2] || 15);

const productsByCategory = {
  Entradas: [
    {
      name: 'Pao de Alho Supremo',
      description: 'Pao de alho assado na brasa com blend de queijos.',
      price: 22.9,
    },
    {
      name: 'Mini Pasteis Crocantes',
      description: 'Porcao com mini pasteis recheados de queijo e carne.',
      price: 28.5,
    },
    {
      name: 'Iscas de Frango da Casa',
      description: 'Iscas empanadas sequinhas com molho especial.',
      price: 31.9,
    },
  ],
  Pizzas: [
    {
      name: 'Pizza Calabresa Especial',
      description: 'Molho artesanal, mussarela, calabresa e cebola roxa.',
      price: 54.9,
    },
    {
      name: 'Pizza Frango com Catupiry',
      description: 'Frango desfiado temperado e catupiry cremoso.',
      price: 57.9,
    },
    {
      name: 'Pizza Quatro Queijos',
      description: 'Mussarela, provolone, parmesao e gorgonzola.',
      price: 61.9,
    },
    {
      name: 'Pizza Portuguesa',
      description: 'Presunto, ovos, cebola, azeitona e mussarela.',
      price: 59.9,
    },
  ],
  Hamburguer: [
    {
      name: 'Burger Classico 180g',
      description: 'Pao brioche, burger 180g, queijo e molho da casa.',
      price: 34.9,
    },
    {
      name: 'Burger Bacon Melt',
      description: 'Hamburguer suculento com bacon crocante e cheddar.',
      price: 39.9,
    },
    {
      name: 'Burger Duplo Monstro',
      description: 'Dois burgers, queijo duplo e cebola caramelizada.',
      price: 46.9,
    },
  ],
  Sushis: [
    {
      name: 'Combo Sushi 20 Pecas',
      description: 'Selecao mista de uramaki, hossomaki e nigiri.',
      price: 64.9,
    },
    {
      name: 'Hot Roll Crocante 10 Pecas',
      description: 'Hot roll com salmao, cream cheese e cebolinha.',
      price: 39.9,
    },
    {
      name: 'Temaki Salmao Premium',
      description: 'Temaki de salmao fresco com cream cheese.',
      price: 29.9,
    },
  ],
};

async function main() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      categories: { select: { id: true, name: true } },
    },
  });

  if (!restaurant) {
    throw new Error(`Restaurante ${restaurantId} nao encontrado.`);
  }

  let created = 0;
  let skipped = 0;

  for (const [categoryName, products] of Object.entries(productsByCategory)) {
    const category = restaurant.categories.find(
      (item) => item.name.toLowerCase() === categoryName.toLowerCase(),
    );

    if (!category) {
      console.log(`Categoria nao encontrada: ${categoryName}. Pulando.`);
      continue;
    }

    for (const product of products) {
      const existing = await prisma.product.findFirst({
        where: {
          restaurantId: restaurant.id,
          name: product.name,
        },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          price: product.price,
          active: true,
          restaurantId: restaurant.id,
          categoryId: category.id,
        },
      });

      created += 1;
    }
  }

  const totalProducts = await prisma.product.count({
    where: { restaurantId: restaurant.id },
  });

  console.log(
    JSON.stringify(
      {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        created,
        skipped,
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
