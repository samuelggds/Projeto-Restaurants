import "dotenv/config";
import prisma from "../src/config/prisma.js";

(async () => {
  try {
    const orderId = Number(process.argv[2] || 44);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        restaurant: {
          select: { id: true, name: true },
        },
        items: true,
      },
    });

    console.log(JSON.stringify(order, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
