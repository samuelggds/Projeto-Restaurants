import "dotenv/config";
import prisma from "../src/config/prisma.js";

(async () => {
  try {
    const restaurantId = Number(process.argv[2] || 1);
    const rows = await prisma.order.findMany({
      where: {
        restaurantId,
        paymentMethod: "CARTAO",
        paid: true,
      },
      select: {
        id: true,
        userId: true,
        restaurantId: true,
        status: true,
        paid: true,
        cardCheckoutSessionId: true,
        createdAt: true,
      },
      orderBy: {
        id: "desc",
      },
      take: 20,
    });

    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
