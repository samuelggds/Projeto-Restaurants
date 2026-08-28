import billingRepository from '../repositories/BillingRepository.js';
import { addDays } from '../utils/dateUtils.js';
import platformPlanCatalogService from './PlatformPlanCatalogService.js';

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

  async execute({ restaurantId, month, year, startDate, endDate }: InvoicePayload) {
    // Busca a assinatura
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

    // Busca o plano
    const plan = await this.planCatalog.getByCode(activePlan, { activeOnly: false });

    const total = plan.monthlyFee;

    const trialEndsAtDate = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
    const dueDate =
      subscription.status === 'TESTE' && trialEndsAtDate && !Number.isNaN(trialEndsAtDate.getTime())
        ? trialEndsAtDate
        : addDays(new Date(), 30);

    // O upsert na chave unica mensal evita duplicidade mesmo com duas
    // execucoes concorrentes (job, retry ou chamada administrativa).
    return this.repository.createMonthlyInvoiceIfAbsent({
      restaurantId,
      month,
      year,
      monthlyFee: plan.monthlyFee,
      systemFees: 0,
      total,
      dueDate,
      status: 'PENDENTE',
    });
  }
}

export default new InvoiceService();
