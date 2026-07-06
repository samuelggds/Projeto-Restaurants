import prisma from "../src/config/prisma.js";

const restaurantId = Number(process.argv[2] || 15);

(async () => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true },
    });

    if (!restaurant) {
      throw new Error(`Restaurante ${restaurantId} não encontrado`);
    }

    const paidInvoices = await prisma.invoice.updateMany({
      where: {
        restaurantId,
        status: {
          in: ["PENDENTE", "ATRASADO"],
        },
      },
      data: {
        status: "PAGO",
        paidAt: new Date(),
      },
    });

    const subscription = await prisma.subscription.updateMany({
      where: { restaurantId },
      data: { status: "ATIVA" },
    });

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { active: true },
      select: { id: true, active: true },
    });

    console.log("✅ Restaurante liberado com sucesso");
    console.log(`Restaurant ID: ${restaurantId}`);
    console.log(`Restaurant Name: ${restaurant.name}`);
    console.log(`Invoices marcadas como PAGO: ${paidInvoices.count}`);
    console.log(`Assinaturas atualizadas para ATIVA: ${subscription.count}`);
    console.log(`Restaurant active: ${updatedRestaurant.active}`);
  } catch (err) {
    console.error("❌ Falha ao liberar restaurante:", err?.message || err);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
