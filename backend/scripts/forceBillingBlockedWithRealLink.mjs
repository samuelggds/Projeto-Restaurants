import "dotenv/config";
import prisma from "../src/config/prisma.js";
import mercadoPagoService from "../src/modules/billing/services/MercadoPagoService.js";

const restaurantId = Number(process.argv[2] || 15);

function overdueDate() {
  const date = new Date();
  date.setDate(date.getDate() - 40);
  return date;
}

(async () => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true },
    });

    if (!restaurant) {
      throw new Error(`Restaurante ${restaurantId} não encontrado`);
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const monthlyFee = 100;
    const systemFees = 40;
    const total = monthlyFee + systemFees;

    const existingInvoice = await prisma.invoice.findFirst({
      where: { restaurantId, month, year },
      select: { id: true },
    });

    const invoice = existingInvoice
      ? await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: {
            status: "ATRASADO",
            dueDate: overdueDate(),
            paidAt: null,
            monthlyFee,
            systemFees,
            total,
          },
        })
      : await prisma.invoice.create({
          data: {
            restaurantId,
            month,
            year,
            monthlyFee,
            systemFees,
            total,
            status: "ATRASADO",
            dueDate: overdueDate(),
          },
        });

    const payment = await mercadoPagoService.createPayment({
      invoiceId: invoice.id,
      title: `Mensalidade restaurante ${restaurant.name}`,
      description: `Fatura ${month}/${year}`,
      amount: total,
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paymentLink: payment.init_point,
      },
    });

    await prisma.subscription.updateMany({
      where: { restaurantId },
      data: { status: "EXPIRADA" },
    });

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { active: false },
    });

    console.log("RESTAURANTE_BLOQUEADO");
    console.log(`Restaurant ID: ${restaurantId}`);
    console.log(`Invoice ID: ${invoice.id}`);
    console.log(`Payment Link: ${payment.init_point}`);
  } catch (err) {
    console.error("ERRO_AO_BLOQUEAR_RESTAURANTE", err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
