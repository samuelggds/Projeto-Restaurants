import { PlanType } from '@prisma/client';
import subscriptionRepository from '../repositories/SubscriptionRepository.js';
import billingRepository from '../../billing/repositories/BillingRepository.js';
import { isAvailablePlan } from '../../billing/config/planConfig.js';
import { addBillingMonth } from '../../billing/utils/billingCycle.js';
import { evaluatePlanChangeEligibility } from './PlanChangePolicy.js';

type RequestPlanChangePayload = {
  restaurantId: number | string;
  plan: PlanType;
};

function periodKey(dateValue: Date | string) {
  const date = new Date(dateValue);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
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

    if (!eligibility.allowed) {
      throw new Error(eligibility.reason);
    }

    if (subscription.plan === plan) {
      return {
        ...subscription,
        message: 'Você já está neste plano.',
      };
    }

    const pendingInvoice = invoices.find((invoice) =>
      ['PENDENTE', 'ATRASADO', 'VENCIDO'].includes(String(invoice.status).toUpperCase()),
    );
    const currentPeriodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : new Date();
    const effectiveDate = pendingInvoice
      ? addBillingMonth(new Date(pendingInvoice.dueDate))
      : currentPeriodEnd;
    const nextPeriod = periodKey(effectiveDate);

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
