import "dotenv/config";
import prisma from "../src/config/prisma.js";
import mercadoPagoService from "../src/modules/billing/services/MercadoPagoService.js";

const restaurantId = Number(process.argv[2] || 1);
const daysOverdue = Number(process.argv[3] || 1);

function getNextInvoicePeriod(baseOffset = 0) {
  const now = new Date();
  let month = now.getMonth() + 1 + baseOffset;
  let year = now.getFullYear();

  if (month > 12) {
    year += Math.floor((month - 1) / 12);
    month = ((month - 1) % 12) + 1;
  }

  return { month, year };
}

async function findAvailablePeriod(targetRestaurantId) {
  for (let offset = 0; offset <= 24; offset += 1) {
    const { month, year } = getNextInvoicePeriod(offset);
    const existing = await prisma.invoice.findFirst({
      where: { restaurantId: targetRestaurantId, month, year },
      select: { id: true },
    });

    if (!existing) {
      return { month, year };
    }
  }

  throw new Error("No free invoice period found in next 24 months");
}

(async () => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true },
    });

    if (!restaurant) {
      throw new Error(`Restaurant ${restaurantId} not found`);
    }

    // Clear any open invoice first to avoid landing in hard-blocked state.
    await prisma.invoice.updateMany({
      where: {
        restaurantId,
        status: { in: ["PENDENTE", "ATRASADO"] },
      },
      data: {
        status: "PAGO",
        paidAt: new Date(),
      },
    });

    const { month, year } = await findAvailablePeriod(restaurantId);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - Math.max(1, daysOverdue));

    const invoice = await prisma.invoice.create({
      data: {
        restaurantId,
        month,
        year,
        monthlyFee: 1,
        systemFees: 0,
        total: 1,
        status: "PENDENTE",
        dueDate,
      },
    });

    const payment = await mercadoPagoService.createPayment({
      invoiceId: invoice.id,
      title: `Mensalidade restaurante ${restaurant.name}`,
      description: `Fatura ${month}/${year}`,
      amount: 1,
    });

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paymentLink: payment.init_point,
      },
      select: {
        id: true,
        status: true,
        dueDate: true,
        paymentLink: true,
      },
    });

    await prisma.subscription.updateMany({
      where: { restaurantId },
      data: { status: "ATIVA" },
    });

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { active: true },
      select: { id: true, name: true, active: true },
    });

    console.log("SIMULACAO_WARNING_ATIVA");
    console.log(
      JSON.stringify(
        {
          restaurant: updatedRestaurant,
          invoice: updatedInvoice,
          note: "Invoice PENDENTE vencida dentro da tolerancia (sem bloqueio).",
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error("ERRO_SIMULACAO_WARNING", err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
