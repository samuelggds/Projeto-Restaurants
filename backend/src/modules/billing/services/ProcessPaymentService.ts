import billingRepository from '../repositories/BillingRepository.js';
import prisma from '../../../config/prisma.js';
import { hasBlockingInvoices } from '../utils/billingRules.js';
import { nextSubscriptionPeriod } from '../utils/billingCycle.js';
import { info } from '../utils/billingLogger.js';

type ProcessPaymentPayload = {
  invoiceId: number | string;
};

class ProcessPaymentService {
  async execute({ invoiceId }: ProcessPaymentPayload) {
    const normalizedInvoiceId = Number(invoiceId);

    if (!Number.isInteger(normalizedInvoiceId) || normalizedInvoiceId <= 0) {
      throw new Error('Fatura inválida.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await billingRepository.markInvoicePaidIfOpen(
        normalizedInvoiceId,
        new Date(),
        tx,
      );
      const invoice = payment.invoice;

      if (!invoice) {
        throw new Error('Fatura não encontrada.');
      }

      if (invoice.status !== 'PAGO') {
        throw new Error('Fatura não está disponível para pagamento.');
      }

      const subscription = await billingRepository.findSubscriptionByRestaurantId(
        invoice.restaurantId,
        tx,
      );

      const openInvoices = await tx.invoice.findMany({
        where: {
          restaurantId: invoice.restaurantId,
          status: {
            in: ['PENDENTE', 'ATRASADO'],
          },
        },
      });
      const remainsBlocked = hasBlockingInvoices(openInvoices, new Date());
      const subscriptionWasCanceled = subscription?.status === 'CANCELADA';

      if (subscription && !subscriptionWasCanceled) {
        const changes: Record<string, unknown> = {
          status: remainsBlocked
            ? 'EXPIRADA'
            : subscription.status === 'TESTE' && subscription.trialEndsAt && new Date() < subscription.trialEndsAt
              ? 'TESTE'
              : 'ATIVA',
        };

        if (payment.marked) {
          const currentPeriodEnd = subscription.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd)
            : new Date(invoice.dueDate);
          const invoiceDueDate = new Date(invoice.dueDate);
          if (
            !Number.isNaN(currentPeriodEnd.getTime()) &&
            Math.abs(currentPeriodEnd.getTime() - invoiceDueDate.getTime()) < 60_000
          ) {
            Object.assign(changes, nextSubscriptionPeriod(currentPeriodEnd));
          }
        }

        await billingRepository.updateSubscription(subscription.id, changes, tx);
      }

      if (remainsBlocked) {
        await billingRepository.deactivateRestaurant(invoice.restaurantId, tx);
      } else if (!subscriptionWasCanceled) {
        await billingRepository.activateRestaurant(invoice.restaurantId, tx);
      }

      return { invoice, remainsBlocked };
    });

    info(
      result.remainsBlocked
        ? 'payment processed but restaurant remains blocked'
        : 'payment processed and restaurant activated',
      {
        invoiceId: normalizedInvoiceId,
        restaurantId: result.invoice.restaurantId,
      },
    );

    return result.invoice;
  }
}

export default new ProcessPaymentService();
