import prisma from "../src/config/prisma.js";

(async () => {
  try {
    const r = await prisma.restaurant.findUnique({ where: { id: 15 } });
    console.log("RESTAURANT:", r);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
