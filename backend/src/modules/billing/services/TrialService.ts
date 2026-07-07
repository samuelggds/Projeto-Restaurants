import billingRepository from "../repositories/BillingRepository.js";
import invoiceService from "./InvoiceService.js";

class TrialService {
  async execute() {
    const subscriptions = await billingRepository.findExpiredTrials();

    for (const subscription of subscriptions) {
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
        status: "ATIVA",
      });
    }
  }
}

export default new TrialService();
