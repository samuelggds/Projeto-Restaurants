import "dotenv/config";
import prisma from "../src/config/prisma.js";

const restaurantId = Number(process.argv[2] || 0);

(async () => {
  try {
    const subs = await prisma.subscription.findMany({
      where:
        Number.isInteger(restaurantId) && restaurantId > 0
          ? { restaurantId }
          : undefined,
      orderBy: [{ restaurantId: "asc" }, { id: "asc" }],
      select: {
        id: true,
        restaurantId: true,
        plan: true,
        scheduledPlan: true,
        status: true,
        trialEndsAt: true,
        balanceDebt: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });

    console.log(
      JSON.stringify(
        {
          filterRestaurantId:
            Number.isInteger(restaurantId) && restaurantId > 0
              ? restaurantId
              : null,
          total: subs.length,
          subscriptions: subs,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
