import "dotenv/config";
import prisma from "../src/config/prisma.js";

(async () => {
  try {
    const products = await prisma.product.findMany({
      where: {
        restaurantId: 2,
        active: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
      orderBy: {
        id: "asc",
      },
      take: 10,
    });

    console.log(
      JSON.stringify(
        products.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
        })),
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
