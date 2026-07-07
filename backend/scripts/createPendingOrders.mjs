import prisma from "../src/config/prisma.js";

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

function sample(arr, index) {
  return arr[index % arr.length];
}

async function resolveRestaurant(restaurantIdArg) {
  const restaurantId = Number(restaurantIdArg || 0);

  if (restaurantId > 0) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true },
    });

    if (!restaurant) {
      throw new Error(`Restaurante ${restaurantId} nao encontrado.`);
    }

    return restaurant;
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      active: true,
      products: {
        some: {
          active: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { id: "asc" },
  });

  if (!restaurant) {
    throw new Error("Nenhum restaurante ativo com produtos foi encontrado.");
  }

  return restaurant;
}

async function resolveUserId(restaurantId) {
  const client = await prisma.user.findFirst({
    where: {
      restaurantId,
      active: true,
      role: "CLIENTE",
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (client) {
    return client.id;
  }

  const fallback = await prisma.user.findFirst({
    where: {
      restaurantId,
      active: true,
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (!fallback) {
    throw new Error(
      `Nenhum usuario ativo encontrado para o restaurante ${restaurantId}.`,
    );
  }

  return fallback.id;
}

async function resolveProducts(restaurantId) {
  const products = await prisma.product.findMany({
    where: {
      restaurantId,
      active: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
    orderBy: { id: "asc" },
    take: 12,
  });

  if (products.length < 2) {
    throw new Error(
      `Produtos insuficientes no restaurante ${restaurantId}. Minimo: 2 ativos.`,
    );
  }

  return products;
}

async function resolveTableIds(restaurantId) {
  const tables = await prisma.table.findMany({
    where: {
      restaurantId,
      active: true,
    },
    select: { id: true },
    orderBy: { number: "asc" },
    take: 3,
  });

  return tables.map((table) => table.id);
}

async function createPendingOrders({ restaurantIdArg, quantityArg }) {
  const quantity = Math.max(1, Math.min(20, Number(quantityArg || 6)));

  const restaurant = await resolveRestaurant(restaurantIdArg);
  const userId = await resolveUserId(restaurant.id);
  const products = await resolveProducts(restaurant.id);
  const tableIds = await resolveTableIds(restaurant.id);

  const orderTypes = ["DELIVERY", "RETIRADA", "MESA"];
  const deliveryPayments = ["PIX", "DINHEIRO", "CARTAO"];

  const createdIds = [];

  for (let i = 0; i < quantity; i += 1) {
    const type = sample(orderTypes, i);
    const productA = sample(products, i);
    const productB = sample(products, i + 3);

    const quantityA = (i % 2) + 1;
    const quantityB = 1;

    const total = toMoney(
      Number(productA.price) * quantityA + Number(productB.price) * quantityB,
    );

    const deliveryData =
      type === "DELIVERY"
        ? {
            address: "Rua das Pizzarias",
            number: String(100 + i),
            district: "Centro",
            city: "Fortaleza",
            state: "CE",
            zipCode: "60000-000",
            complement: i % 2 === 0 ? "Apto 202" : "Casa",
          }
        : {};

    const tableData =
      type === "MESA" && tableIds.length > 0
        ? { tableId: sample(tableIds, i) }
        : {};

    const paymentMethod =
      type === "MESA" ? "DINHEIRO" : sample(deliveryPayments, i);

    const createdOrder = await prisma.order.create({
      data: {
        total,
        status: "PENDENTE",
        type,
        paymentMethod,
        paid: false,
        observation: `Pedido de teste ${i + 1} (responsividade).`,
        systemFee: 0,
        userId,
        restaurantId: restaurant.id,
        ...deliveryData,
        ...tableData,
        items: {
          create: [
            {
              quantity: quantityA,
              price: toMoney(Number(productA.price)),
              observation: "Sem cebola",
              productId: productA.id,
            },
            {
              quantity: quantityB,
              price: toMoney(Number(productB.price)),
              observation: "Borda recheada",
              productId: productB.id,
            },
          ],
        },
      },
      select: {
        id: true,
        status: true,
        type: true,
        total: true,
        createdAt: true,
      },
    });

    createdIds.push(createdOrder.id);
  }

  return {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    quantity,
    createdOrderIds: createdIds,
  };
}

(async () => {
  try {
    const [restaurantIdArg, quantityArg] = process.argv.slice(2);
    const result = await createPendingOrders({ restaurantIdArg, quantityArg });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
