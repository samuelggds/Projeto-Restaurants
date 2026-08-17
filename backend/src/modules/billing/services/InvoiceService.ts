import billingRepository from '../repositories/BillingRepository.js';
import { PLAN_CONFIG } from '../config/planConfig.js';
import { addDays } from '../utils/dateUtils.js';

type InvoicePayload = {
  restaurantId: number;
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
};

class InvoiceService {
  async execute({ restaurantId, month, year, startDate, endDate }: InvoicePayload) {
    // Busca a assinatura
    const subscription = await billingRepository.findSubscriptionByRestaurantId(restaurantId);

    if (!subscription) {
      throw new Error('Assinatura não encontrada.');
    }

    let activePlan = subscription.plan;
    const shouldApplyScheduledPlan =
      subscription.scheduledPlan &&
      subscription.scheduledPlanEffectiveMonth === month &&
      subscription.scheduledPlanEffectiveYear === year;

    if (shouldApplyScheduledPlan) {
      const updatedSubscription = await billingRepository.updateSubscription(subscription.id, {
        plan: subscription.scheduledPlan,
        scheduledPlan: null,
        scheduledPlanEffectiveMonth: null,
        scheduledPlanEffectiveYear: null,
      });

      activePlan = updatedSubscription.plan;
    }

    // Busca o plano
    const plan = PLAN_CONFIG[activePlan];

    if (!plan) {
      throw new Error('Plano inválido.');
    }

    // Evita criar duas invoices do mesmo mês
    const invoiceExists = await billingRepository.findInvoiceByMonth(restaurantId, month, year);

    if (invoiceExists) {
      return invoiceExists;
    }

    const total = plan.monthlyFee;

    const trialEndsAtDate = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
    const dueDate =
      subscription.status === 'TESTE' && trialEndsAtDate && !Number.isNaN(trialEndsAtDate.getTime())
        ? trialEndsAtDate
        : addDays(new Date(), 30);

    // Cria invoice
    return billingRepository.createInvoice({
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
