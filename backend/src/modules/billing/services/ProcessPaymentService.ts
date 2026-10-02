import { Prisma } from '@prisma/client';
import billingRepository from '../repositories/BillingRepository.js';
import prisma from '../../../config/prisma.js';
import { hasBlockingInvoices } from '../utils/billingRules.js';
import { addBillingMonth, nextSubscriptionPeriod } from '../utils/billingCycle.js';
import { info } from '../utils/billingLogger.js';

type ProcessPaymentPayload = {
  invoiceId: number | string;
  paymentAttemptId?: number | string | null;
};

export type InvoicePaymentSettlement =
  | 'APPLIED'
  | 'IDEMPOTENT'
  | 'DUPLICATE'
  | 'REFUNDED';

class ProcessPaymentService {
  async execute(payload: ProcessPaymentPayload) {
    return (await this.executeTracked(payload)).invoice;
  }

  async executeTracked({ invoiceId, paymentAttemptId }: ProcessPaymentPayload) {
    const normalizedInvoiceId = Number(invoiceId);
    const normalizedAttemptId =
      paymentAttemptId === undefined || paymentAttemptId === null
        ? null
        : Number(paymentAttemptId);

    if (!Number.isInteger(normalizedInvoiceId) || normalizedInvoiceId <= 0) {
      throw new Error('Fatura inválida.');
    }
    if (
      normalizedAttemptId !== null &&
      (!Number.isInteger(normalizedAttemptId) || normalizedAttemptId <= 0)
    ) {
      throw new Error('Tentativa de pagamento inválida.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      if (normalizedAttemptId !== null) {
        await tx.$queryRaw(Prisma.sql`
          SELECT "id"
          FROM "Invoice"
          WHERE "id" = ${normalizedInvoiceId}
          FOR UPDATE
        `);

        const attempt = await tx.invoicePaymentAttempt.findFirst({
          where: {
            id: normalizedAttemptId,
            invoiceId: normalizedInvoiceId,
          },
        });
        if (!attempt) {
          throw new Error('Tentativa de pagamento não pertence à fatura.');
        }

        const currentInvoice = await tx.invoice.findUnique({
          where: { id: normalizedInvoiceId },
        });
        if (!currentInvoice) throw new Error('Fatura não encontrada.');

        if (attempt.status === 'APPLIED') {
          const openInvoices = await tx.invoice.findMany({
            where: {
              restaurantId: currentInvoice.restaurantId,
              status: { in: ['PENDENTE', 'ATRASADO'] },
            },
          });
          return {
            invoice: currentInvoice,
            remainsBlocked: hasBlockingInvoices(openInvoices, now),
            settlement: 'IDEMPOTENT' as InvoicePaymentSettlement,
          };
        }

        if (attempt.status === 'REFUNDED') {
          return {
            invoice: currentInvoice,
            remainsBlocked: false,
            settlement: 'REFUNDED' as InvoicePaymentSettlement,
          };
        }

        if (attempt.status === 'DUPLICATE' || currentInvoice.status === 'PAGO' || currentInvoice.status === 'CANCELADO') {
          if (attempt.status !== 'DUPLICATE') {
            await tx.invoicePaymentAttempt.updateMany({
              where: {
                id: normalizedAttemptId,
                invoiceId: normalizedInvoiceId,
                restaurantId: currentInvoice.restaurantId,
                status: { notIn: ['APPLIED', 'REFUNDED', 'DUPLICATE'] },
              },
              data: {
                status: 'DUPLICATE',
                providerStatus: 'approved',
                settledAt: now,
              },
            });
          }
          return {
            invoice: currentInvoice,
            remainsBlocked: false,
            settlement: 'DUPLICATE' as InvoicePaymentSettlement,
          };
        }
      }

      const payment = await billingRepository.markInvoicePaidIfOpen(
        normalizedInvoiceId,
        now,
        tx,
      );
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

      if (normalizedAttemptId !== null) {
        const attemptApplied = await tx.invoicePaymentAttempt.updateMany({
          where: {
            id: normalizedAttemptId,
            invoiceId: normalizedInvoiceId,
            restaurantId: invoice.restaurantId,
            status: { notIn: ['APPLIED', 'REFUNDED', 'DUPLICATE'] },
          },
          data: {
            status: 'APPLIED',
            providerStatus: 'approved',
            settledAt: now,
            appliedAt: now,
          },
        });
        if (attemptApplied.count !== 1) {
          throw new Error('Tentativa de pagamento foi atualizada por outro processo.');
        }
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
      const wasBillingBlocked = subscription?.restaurant?.accessBlockReason === 'BILLING';

      if (subscription && !subscriptionWasCanceled) {
        const changes: Prisma.SubscriptionUpdateInput = {
          status: remainsBlocked
            ? 'EXPIRADA'
            : subscription.status === 'TESTE' && subscription.trialEndsAt && new Date() < subscription.trialEndsAt
              ? 'TESTE'
              : 'ATIVA',
        };

        if (payment.marked && !remainsBlocked) {
          const paidAt = invoice.paidAt ? new Date(invoice.paidAt) : new Date();

          if (wasBillingBlocked && !Number.isNaN(paidAt.getTime())) {
            Object.assign(changes, {
              currentPeriodStart: paidAt,
              currentPeriodEnd: addBillingMonth(paidAt),
            });
          } else {
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
        }

        await billingRepository.updateSubscription(subscription.id, changes, tx);
      }

      if (remainsBlocked) {
        await billingRepository.deactivateRestaurant(invoice.restaurantId, tx);
      } else if (!subscriptionWasCanceled) {
        await billingRepository.activateRestaurant(invoice.restaurantId, tx);
      }

      return {
        invoice,
        remainsBlocked,
        settlement: (normalizedAttemptId !== null
          ? payment.marked
            ? 'APPLIED'
            : 'IDEMPOTENT'
          : 'APPLIED') as InvoicePaymentSettlement,
      };
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

    return {
      invoice: result.invoice,
      settlement: result.settlement,
    };
  }
}

export default new ProcessPaymentService();
