import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import mercadoPagoService from '../src/modules/billing/services/MercadoPagoService.js';

const restaurantId = Number(process.argv[2] || 15);

(async () => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        restaurantId,
        status: { in: ['PENDENTE', 'ATRASADO'] },
      },
      orderBy: { id: 'desc' },
    });

    if (!invoice) {
      throw new Error(`Nenhuma invoice aberta encontrada para restaurante ${restaurantId}`);
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        monthlyFee: 1,
        systemFees: 0,
        total: 1,
      },
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true },
    });

    const payment = await mercadoPagoService.createPayment({
      invoiceId: updated.id,
      title: `Mensalidade restaurante ${restaurant?.name || restaurantId}`,
      description: `Fatura ${updated.month}/${updated.year}`,
      amount: 1,
    });

    const finalInvoice = await prisma.invoice.update({
      where: { id: updated.id },
      data: { paymentLink: payment.init_point },
    });

    console.log('INVOICE_ATUALIZADA');
    console.log(
      JSON.stringify(
        {
          invoiceId: finalInvoice.id,
          monthlyFee: Number(finalInvoice.monthlyFee),
          systemFees: Number(finalInvoice.systemFees),
          total: Number(finalInvoice.total),
          status: finalInvoice.status,
          paymentLink: finalInvoice.paymentLink,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error('ERRO_AO_AJUSTAR_INVOICE', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
