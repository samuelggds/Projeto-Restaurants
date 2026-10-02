import prisma from '../../../config/prisma.js';
import { getPlatformPaymentRefundClient } from './MercadoPagoClient.js';

export class RefundDuplicateInvoicePaymentService {
  async execute(paymentAttemptIdValue: number | string) {
    const paymentAttemptId = Number(paymentAttemptIdValue);
    if (!Number.isSafeInteger(paymentAttemptId) || paymentAttemptId <= 0) {
      throw new Error('Tentativa de pagamento inválida para estorno.');
    }

    const attempt = await prisma.invoicePaymentAttempt.findUnique({
      where: { id: paymentAttemptId },
    });
    if (!attempt) throw new Error('Tentativa de pagamento não encontrada.');

    if (attempt.status === 'REFUNDED') {
      return { refunded: true, idempotentReplay: true };
    }
    if (attempt.status !== 'DUPLICATE') {
      throw new Error('Somente liquidação duplicada pode ser estornada automaticamente.');
    }
    if (attempt.provider !== 'MERCADO_PAGO') {
      throw new Error('Provedor não suportado para estorno automático da mensalidade.');
    }

    const refundApi = getPlatformPaymentRefundClient();
    await refundApi.total({
      payment_id: attempt.providerPaymentId,
      requestOptions: {
        idempotencyKey: `invoice-duplicate-refund-${attempt.id}`,
      },
    });

    const updated = await prisma.invoicePaymentAttempt.updateMany({
      where: {
        id: attempt.id,
        invoiceId: attempt.invoiceId,
        restaurantId: attempt.restaurantId,
        status: 'DUPLICATE',
      },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      const current = await prisma.invoicePaymentAttempt.findUnique({
        where: { id: attempt.id },
      });
      if (current?.status !== 'REFUNDED') {
        throw new Error('Tentativa duplicada mudou durante o estorno.');
      }
      return { refunded: true, idempotentReplay: true };
    }

    return { refunded: true, idempotentReplay: false };
  }
}

export default new RefundDuplicateInvoicePaymentService();
