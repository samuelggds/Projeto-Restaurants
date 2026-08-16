import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import mercadoPagoService from '../src/modules/billing/services/MercadoPagoService.js';

const restaurantId = Number(process.argv[2] || 15);

function getNextInvoicePeriod(baseOffset = 1) {
  const now = new Date();
  let month = now.getMonth() + 1 + baseOffset;
  let year = now.getFullYear();

  if (month > 12) {
    year += Math.floor((month - 1) / 12);
    month = ((month - 1) % 12) + 1;
  }

  return { month, year };
}

async function findAvailablePeriod(restaurantId) {
  for (let offset = 1; offset <= 24; offset += 1) {
    const { month, year } = getNextInvoicePeriod(offset);
    const existing = await prisma.invoice.findFirst({
      where: { restaurantId, month, year },
      select: { id: true },
    });

    if (!existing) {
      return { month, year };
    }
  }

  throw new Error('Nao foi encontrado periodo livre para invoice nos proximos 24 meses');
}

(async () => {
  try {
    const { month, year } = await findAvailablePeriod(restaurantId);

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true },
    });

    if (!restaurant) {
      throw new Error(`Restaurante ${restaurantId} nao encontrado`);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await prisma.invoice.create({
      data: {
        restaurantId,
        month,
        year,
        monthlyFee: 1,
        systemFees: 0,
        total: 1,
        status: 'PENDENTE',
        dueDate,
      },
    });

    const payment = await mercadoPagoService.createPayment({
      invoiceId: invoice.id,
      title: `Mensalidade restaurante ${restaurant.name}`,
      description: `Fatura ${month}/${year}`,
      amount: 1,
    });

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { paymentLink: payment.init_point },
    });

    console.log('INVOICE_CRIADA');
    console.log(
      JSON.stringify(
        {
          invoiceId: updated.id,
          restaurantId,
          month,
          year,
          total: Number(updated.total),
          status: updated.status,
          paymentLink: updated.paymentLink,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error('ERRO_AO_CRIAR_INVOICE', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
