import prisma from "../src/config/prisma.js";

(async () => {
  try {
    const subs = await prisma.subscription.findMany({
      where: { restaurantId: 15 },
    });
    console.log("SUBSCRIPTIONS:", subs);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
