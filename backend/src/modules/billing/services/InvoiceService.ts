import billingRepository from '../repositories/BillingRepository.js';
import platformPlanCatalogService from './PlatformPlanCatalogService.js';
import { resolveSubscriptionDueDate } from '../utils/billingCycle.js';

type InvoicePayload = {
  restaurantId: number;
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
};

export class InvoiceService {
  constructor(
    private readonly repository: Pick<
      typeof billingRepository,
      'findSubscriptionByRestaurantId' | 'updateSubscription' | 'createMonthlyInvoiceIfAbsent'
    > = billingRepository,
    private readonly planCatalog: Pick<
      typeof platformPlanCatalogService,
      'getByCode'
    > = platformPlanCatalogService,
  ) {}

  async execute({ restaurantId, month, year, endDate }: InvoicePayload) {
    const subscription = await this.repository.findSubscriptionByRestaurantId(restaurantId);

    if (!subscription) {
      throw new Error('Assinatura não encontrada.');
    }

    let activePlan = subscription.plan;
    const shouldApplyScheduledPlan =
      subscription.scheduledPlan &&
      subscription.scheduledPlanEffectiveMonth === month &&
      subscription.scheduledPlanEffectiveYear === year;

    if (shouldApplyScheduledPlan) {
      const updatedSubscription = await this.repository.updateSubscription(subscription.id, {
        plan: subscription.scheduledPlan,
        scheduledPlan: null,
        scheduledPlanEffectiveMonth: null,
        scheduledPlanEffectiveYear: null,
      });

      activePlan = updatedSubscription.plan;
    }

    const plan = await this.planCatalog.getByCode(activePlan, { activeOnly: false });
    const dueDate = resolveSubscriptionDueDate(subscription) || endDate;

    return this.repository.createMonthlyInvoiceIfAbsent({
      restaurantId,
      month,
      year,
      monthlyFee: plan.monthlyFee,
      systemFees: 0,
      total: plan.monthlyFee,
      dueDate,
      status: 'PENDENTE',
    });
  }
}

export default new InvoiceService();
