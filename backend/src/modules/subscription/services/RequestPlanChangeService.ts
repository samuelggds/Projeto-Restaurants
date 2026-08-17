import { PlanType } from '@prisma/client';
import subscriptionRepository from '../repositories/SubscriptionRepository.js';
import billingRepository from '../../billing/repositories/BillingRepository.js';
import { isAvailablePlan } from '../../billing/config/planConfig.js';
import { evaluatePlanChangeEligibility } from './PlanChangePolicy.js';

type RequestPlanChangePayload = {
  restaurantId: number | string;
  plan: PlanType;
};

function getNextMonthPeriod(fromDate: Date) {
  const next = new Date(fromDate);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);

  return {
    month: next.getMonth() + 1,
    year: next.getFullYear(),
  };
}

class RequestPlanChangeService {
  async execute({ restaurantId, plan }: RequestPlanChangePayload) {
    if (!Object.values(PlanType).includes(plan) || !isAvailablePlan(plan)) {
      throw new Error('Escolha um plano disponível: Básico ou Premium.');
    }

    const subscription = await subscriptionRepository.findByRestaurantId(restaurantId);

    if (!subscription) {
      throw new Error('Assinatura não encontrada.');
    }

    const invoices = await billingRepository.findInvoicesByRestaurantId(Number(restaurantId));
    const eligibility = evaluatePlanChangeEligibility({
      invoices,
      consumedInvoiceId: subscription.planChangeInvoiceId,
      hasScheduledPlan: Boolean(subscription.scheduledPlan),
    });

    if (!eligibility.allowed || !eligibility.invoiceId) {
      throw new Error(eligibility.reason);
    }

    if (subscription.plan === plan) {
      const updated = await subscriptionRepository.update(restaurantId, {
        planChangeInvoiceId: eligibility.invoiceId,
        planChangeLockedUntil: null,
        scheduledPlan: null,
        scheduledPlanEffectiveMonth: null,
        scheduledPlanEffectiveYear: null,
      });

      return {
        ...updated,
        message: 'Plano atual mantido para o próximo ciclo de faturamento.',
      };
    }

    const nextPeriod = getNextMonthPeriod(new Date());
    const updated = await subscriptionRepository.update(restaurantId, {
      planChangeInvoiceId: eligibility.invoiceId,
      scheduledPlan: plan,
      scheduledPlanEffectiveMonth: nextPeriod.month,
      scheduledPlanEffectiveYear: nextPeriod.year,
      planChangeLockedUntil: null,
    });

    return {
      ...updated,
      message: 'Troca de plano agendada para o próximo ciclo de faturamento.',
    };
  }
}

export default new RequestPlanChangeService();
