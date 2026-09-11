import prisma from '../../../config/prisma.js';
import billingRepository from '../repositories/BillingRepository.js';
import invoiceService from './InvoiceService.js';
import {
  getInvoiceCreationDate,
  invoicePeriodFromDueDate,
  resolveSubscriptionDueDate,
} from '../utils/billingCycle.js';

class TrialService {
  async execute() {
    const now = new Date();
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'TESTE',
        trialEndsAt: { not: null },
      },
    });
    const failures: Error[] = [];

    for (const subscription of subscriptions) {
      try {
        const dueDate = resolveSubscriptionDueDate(subscription);
        if (!dueDate) continue;

        if (now >= getInvoiceCreationDate(dueDate)) {
          const { month, year } = invoicePeriodFromDueDate(dueDate);
          await invoiceService.execute({
            restaurantId: subscription.restaurantId,
            month,
            year,
            startDate: subscription.currentPeriodStart || subscription.createdAt,
            endDate: dueDate,
          });
        }

        if (now >= dueDate) {
          await billingRepository.updateSubscription(subscription.id, {
            status: 'ATIVA',
          });
        }
      } catch (cause) {
        failures.push(new Error('Failed to process a trial billing cycle.', { cause }));
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, 'Trial processing completed with failures.');
    }
  }
}

export default new TrialService();
