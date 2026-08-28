import billingRepository from '../repositories/BillingRepository.js';
import invoiceService from './InvoiceService.js';

class TrialService {
  async execute() {
    const subscriptions = await billingRepository.findExpiredTrials();
    const failures: Error[] = [];

    for (const subscription of subscriptions) {
      try {
        const today = new Date();

        const month = today.getMonth() + 1;
        const year = today.getFullYear();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        await invoiceService.execute({
          restaurantId: subscription.restaurantId,
          month,
          year,
          startDate,
          endDate,
        });

        await billingRepository.updateSubscription(subscription.id, {
          status: 'ATIVA',
        });
      } catch (cause) {
        failures.push(new Error('Failed to process an expired trial.', { cause }));
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, 'Trial processing completed with failures.');
    }
  }
}

export default new TrialService();
