import prisma from '../../../config/prisma.js';
import trialService from '../services/TrialService.js';
import invoiceService from '../services/InvoiceService.js';
import billingRepository from '../repositories/BillingRepository.js';
import { isInvoiceBlocking } from '../utils/billingRules.js';
import {
  invoicePeriodFromDueDate,
  isInvoiceCreationDue,
  resolveSubscriptionDueDate,
} from '../utils/billingCycle.js';
import { debug, error, info, warn } from '../utils/billingLogger.js';

class BillingJob {
  async execute() {
    info('BillingJob started');
    const now = new Date();
    const failures: Error[] = [];

    try {
      await trialService.execute();
    } catch (cause) {
      failures.push(new Error('Trial billing phase failed.', { cause }));
      error('failed to process trial service', {
        errorType: cause instanceof Error ? cause.name : 'UNKNOWN_ERROR',
      });
    }

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

    for (const sub of activeSubscriptions) {
      try {
        const dueDate = resolveSubscriptionDueDate(sub);
        if (!dueDate || !isInvoiceCreationDue(dueDate, now)) continue;
        const { month, year } = invoicePeriodFromDueDate(dueDate);

        await invoiceService.execute({
          restaurantId: sub.restaurantId,
          month,
          year,
          startDate: sub.currentPeriodStart || sub.createdAt,
          endDate: dueDate,
        });
      } catch (cause) {
        failures.push(new Error('Restaurant billing item failed.', { cause }));
        error('failed to process restaurant billing', {
          restaurantId: sub.restaurantId,
          errorType: cause instanceof Error ? cause.name : 'UNKNOWN_ERROR',
        });
      }
    }

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
      if (!isInvoiceBlocking(invoice, now)) continue;

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

        if (subscription && subscription.status !== 'CANCELADA') {
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
