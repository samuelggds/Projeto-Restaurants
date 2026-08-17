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

    // 1. Processa os Trials primeiro (Eles viram "ATIVA" e já ganham faturas com links da Stripe)
    try {
      await trialService.execute();
    } catch (err) {
      error('failed to process trial service', {
        message: err?.message || String(err),
      });
    }

    // 2. Busca assinaturas ATIVAS para checar quem precisa de renovação mensal
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: 'ATIVA' },
    });

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
      } catch (err) {
        error('failed to process restaurant billing', {
          restaurantId: sub.restaurantId,
          message: err?.message || String(err),
        });
      }
    }

    // 3. Bloqueia quem ultrapassou 30 dias + 5 dias úteis de tolerância
    try {
      const pendingInvoices = await billingRepository.findPendingInvoices();

      for (const invoice of pendingInvoices) {
        const shouldBlock = isInvoiceBlocking(invoice, now);

        if (!shouldBlock) {
          continue;
        }

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
      }
    } catch (err) {
      error('failed to process overdue invoices', {
        message: err?.message || String(err),
      });
    }

    info('BillingJob finished');
  }
}

export default new BillingJob();
