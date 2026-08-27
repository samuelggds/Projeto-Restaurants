import './_shared/disabledLegacyScript.mjs';
import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import mercadoPagoService from '../src/modules/billing/services/MercadoPagoService.js';

const invoiceId = Number(process.argv[2]);

if (!invoiceId) {
  console.error('Uso: node scripts/regenerateInvoicePaymentLink.mjs <invoiceId>');
  process.exit(1);
}

(async () => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { restaurant: true },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} não encontrada`);
    }

    const payment = await mercadoPagoService.createPayment({
      invoiceId: invoice.id,
      title: `Mensalidade restaurante ${invoice.restaurant?.name || invoice.restaurantId}`,
      description: `Fatura ${invoice.month}/${invoice.year}`,
      amount: invoice.total,
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { paymentLink: payment.init_point },
    });

    console.log('✅ LINK GERADO E SALVO:', payment.init_point);
  } catch (err) {
    console.error('❌ Falha ao regenerar link:', err?.message || err);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
