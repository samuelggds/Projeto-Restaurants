import "dotenv/config";
import prisma from "../src/config/prisma.js";

const restaurantId = Number(process.argv[2] || 1);
const targetPerCategory = Number(process.argv[3] || 30);

const categoryPriceRange = {
  pizzas: [45, 82],
  bebidas: [6, 18],
  sobremesas: [12, 28],
  entradas: [14, 34],
  hamburguer: [24, 48],
  sushi: [28, 72],
  sushis: [28, 72],
  massas: [28, 56],
  saladas: [18, 36],
};

const categoryImagePool = {
  pizzas: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1548365328-9f547fb0953b?auto=format&fit=crop&w=1200&q=80",
  ],
  bebidas: [
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551024709-8f23befc6cf7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80",
  ],
  sobremesas: [
    "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80",
  ],
  entradas: [
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  ],
  hamburguer: [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
  ],
  sushi: [
    "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1200&q=80",
  ],
  sushis: [
    "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1200&q=80",
  ],
  massas: [
    "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=80",
  ],
  saladas: [
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80",
  ],
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function pickPriceRange(categoryName) {
  const key = normalizeKey(categoryName);
  return categoryPriceRange[key] || [15, 55];
}

function toPrice(min, max, index) {
  const span = Math.max(max - min, 1);
  const price = min + ((index * 3.17) % span);
  return Number(price.toFixed(2));
}

function buildProductName(categoryName, index) {
  const suffix = String(index).padStart(2, "0");
  return `${categoryName} Especial ${suffix}`;
}

function buildDescription(categoryName, index) {
  const variants = [
    "feito na hora com ingredientes frescos",
    "receita da casa com toque especial do chef",
    "sabor equilibrado e finalizacao artesanal",
    "combinacao premium para uma experiencia completa",
  ];

  return `${categoryName} ${index}: ${variants[index % variants.length]}.`;
}

function pickImage(categoryName, index) {
  const key = normalizeKey(categoryName);
  const pool = categoryImagePool[key] || [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
  ];

  return pool[index % pool.length];
}

async function main() {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new Error("restaurantId invalido.");
  }

  if (!Number.isInteger(targetPerCategory) || targetPerCategory <= 0) {
    throw new Error("targetPerCategory invalido.");
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      categories: {
        select: {
          id: true,
          name: true,
          products: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!restaurant) {
    throw new Error(`Restaurante ${restaurantId} nao encontrado.`);
  }

  let totalCreated = 0;
  let totalImageBackfilled = 0;
  const categoryResults = [];

  for (const category of restaurant.categories) {
    const existingNames = new Set(
      category.products.map((item) => normalizeKey(item.name)),
    );

    const [minPrice, maxPrice] = pickPriceRange(category.name);
    const toCreate = [];
    let currentCount = category.products.length;
    let attemptIndex = 1;

    while (currentCount + toCreate.length < targetPerCategory) {
      const name = buildProductName(category.name, attemptIndex);
      const normalizedName = normalizeKey(name);

      if (!existingNames.has(normalizedName)) {
        toCreate.push({
          name,
          description: buildDescription(category.name, attemptIndex),
          image: pickImage(category.name, attemptIndex),
          price: toPrice(minPrice, maxPrice, attemptIndex),
          active: true,
          restaurantId: restaurant.id,
          categoryId: category.id,
        });
        existingNames.add(normalizedName);
      }

      attemptIndex += 1;
      if (attemptIndex > targetPerCategory * 10) {
        break;
      }
    }

    if (toCreate.length > 0) {
      await prisma.product.createMany({
        data: toCreate,
      });
    }

    const productsWithoutImage = category.products.filter(
      (item) => !String(item.image || "").trim(),
    );

    let updatedImages = 0;
    if (productsWithoutImage.length > 0) {
      await prisma.$transaction(
        productsWithoutImage.map((product, index) =>
          prisma.product.update({
            where: { id: product.id },
            data: {
              image: pickImage(category.name, index),
            },
          }),
        ),
      );

      updatedImages = productsWithoutImage.length;
    }

    totalCreated += toCreate.length;
    totalImageBackfilled += updatedImages;
    categoryResults.push({
      categoryId: category.id,
      categoryName: category.name,
      alreadyHad: category.products.length,
      createdNow: toCreate.length,
      finalTotal: category.products.length + toCreate.length,
      imageBackfilled: updatedImages,
    });
  }

  console.log(
    JSON.stringify(
      {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        targetPerCategory,
        totalCreated,
        totalImageBackfilled,
        categories: categoryResults,
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
