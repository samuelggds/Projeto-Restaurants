import "dotenv/config";
import prisma from "../src/config/prisma.js";

(async () => {
  try {
    const rows = await prisma.restaurantSettings.findMany({
      select: {
        restaurantId: true,
        pixProvider: true,
        cardGateway: true,
        pixKey: true,
        gatewayMerchantId: true,
        asaasAccessToken: true,
      },
      orderBy: {
        restaurantId: "asc",
      },
    });

    const out = rows.map((row) => ({
      restaurantId: row.restaurantId,
      pixProvider: row.pixProvider,
      cardGateway: row.cardGateway,
      pixKey: row.pixKey,
      gatewayMerchantId: row.gatewayMerchantId,
      asaasAccessTokenConfigured: Boolean(
        String(row.asaasAccessToken || "").trim(),
      ),
    }));

    console.log(JSON.stringify(out, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
