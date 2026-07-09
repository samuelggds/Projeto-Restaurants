import "dotenv/config";
import prisma from "../src/config/prisma.js";
import orderRepository from "../src/modules/orders/repositories/OrderRepository.js";

(async () => {
  try {
    const restaurantId = Number(process.argv[2] || 1);
    const ids = process.argv
      .slice(3)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (!ids.length) {
      throw new Error("Informe ao menos um ID de pedido.");
    }

    const visible = await orderRepository.findAll(restaurantId);
    const visibleIds = new Set(visible.map((order) => Number(order.id)));

    const rows = await prisma.order.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        paid: true,
        type: true,
        status: true,
        observation: true,
        createdAt: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    console.log(
      JSON.stringify(
        {
          restaurantId,
          rows,
          visibility: ids.map((id) => ({
            id,
            appearsInAdminEmployeeFlow: visibleIds.has(id),
          })),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
