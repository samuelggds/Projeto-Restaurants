import prisma from '../../../config/prisma.js';
import trialService from '../services/TrialService.js';
import invoiceService from '../services/InvoiceService.js';
import billingRepository from '../repositories/BillingRepository.js';
import { isInvoiceBlocking } from '../utils/billingRules.js';
import { debug, error, info, warn } from '../utils/billingLogger.js';

class BillingJob {
  async execute() {
    info('BillingJob started');
    const now = new Date();
    const failures: Error[] = [];

    // 1. Processa os Trials primeiro (Eles viram "ATIVA" e já ganham faturas com links da Stripe)
    try {
      await trialService.execute();
    } catch (cause) {
      failures.push(new Error('Trial billing phase failed.', { cause }));
      error('failed to process trial service', {
        errorType: cause instanceof Error ? cause.name : 'UNKNOWN_ERROR',
      });
    }

    // 2. Busca assinaturas ATIVAS para checar quem precisa de renovação mensal
    let activeSubscriptions: Awaited<ReturnType<typeof prisma.subscription.findMany>> = [];
    try {
      activeSubscriptions = await prisma.subscription.findMany({
        where: { status: 'ATIVA' },
      });
    } catch (cause) {
      failures.push(new Error('Active subscription lookup failed.', { cause }));
      error('failed to load active subscriptions', {
        errorType: cause instanceof Error ? cause.name : 'UNKNOWN_ERROR',
      });
    }

    debug('active subscriptions to process', {
      count: activeSubscriptions.length,
    });

    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    for (const sub of activeSubscriptions) {
      try {
        // Alimenta o InvoiceService. Ele cuidará de checar se a fatura já existe,
        // calcular os valores, criar no banco e gerar a sessão correta na Stripe.
        await invoiceService.execute({
          restaurantId: sub.restaurantId,
          month,
          year,
          startDate,
          endDate,
        });
      } catch (cause) {
        failures.push(new Error('Restaurant billing item failed.', { cause }));
        error('failed to process restaurant billing', {
          restaurantId: sub.restaurantId,
          errorType: cause instanceof Error ? cause.name : 'UNKNOWN_ERROR',
        });
      }
    }

    // 3. Bloqueia quem ultrapassou 30 dias + 5 dias úteis de tolerância
    let pendingInvoices: Awaited<ReturnType<typeof billingRepository.findPendingInvoices>> = [];
    try {
      pendingInvoices = await billingRepository.findPendingInvoices();
    } catch (cause) {
      failures.push(new Error('Pending invoice lookup failed.', { cause }));
      error('failed to load pending invoices', {
        errorType: cause instanceof Error ? cause.name : 'UNKNOWN_ERROR',
      });
    }

    for (const invoice of pendingInvoices) {
      const shouldBlock = isInvoiceBlocking(invoice, now);

      if (!shouldBlock) {
        continue;
      }

      try {
        warn('applying block for overdue invoice', {
          invoiceId: invoice.id,
          dueDate: invoice.dueDate,
        });

        await billingRepository.updateInvoice(invoice.id, {
          status: 'ATRASADO',
        });

        const subscription = await billingRepository.findSubscriptionByRestaurantId(
          invoice.restaurantId,
        );

        if (subscription) {
          await billingRepository.updateSubscription(subscription.id, {
            status: 'EXPIRADA',
          });
        }

        await billingRepository.deactivateRestaurant(invoice.restaurantId);
      } catch (cause) {
        failures.push(new Error('Overdue invoice item failed.', { cause }));
        error('failed to process overdue invoice', {
          invoiceId: invoice.id,
          restaurantId: invoice.restaurantId,
          errorType: cause instanceof Error ? cause.name : 'UNKNOWN_ERROR',
        });
      }
    }

    if (failures.length > 0) {
      error('BillingJob finished with failures', { failureCount: failures.length });
      throw new AggregateError(failures, 'Billing job completed with failures.');
    }

    info('BillingJob finished', { failureCount: 0 });
  }
}

export default new BillingJob();
