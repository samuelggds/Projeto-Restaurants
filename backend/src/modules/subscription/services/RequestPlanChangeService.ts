import { PlanType } from "@prisma/client";
import subscriptionRepository from "../repositories/SubscriptionRepository.js";
import billingRepository from "../../billing/repositories/BillingRepository.js";

type RequestPlanChangePayload = {
  restaurantId: number | string;
  plan: PlanType;
};

function getNextMonthPeriod(fromDate: Date) {
  const next = new Date(fromDate);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);

  const lockUntil = new Date(next);
  lockUntil.setMonth(lockUntil.getMonth() + 1);

  return {
    month: next.getMonth() + 1,
    year: next.getFullYear(),
    lockUntil,
  };
}

class RequestPlanChangeService {
  async execute({ restaurantId, plan }: RequestPlanChangePayload) {
    if (!Object.values(PlanType).includes(plan)) {
      throw new Error("Plano invalido para troca.");
    }

    const subscription =
      await subscriptionRepository.findByRestaurantId(restaurantId);

    if (!subscription) {
      throw new Error("Assinatura nao encontrada.");
    }

    const now = new Date();
    const invoices = await billingRepository.findInvoicesByRestaurantId(
      Number(restaurantId),
    );
    const latestInvoice = invoices[0] || null;

    if (!latestInvoice || latestInvoice.status !== "PAGO") {
      throw new Error(
        "Para trocar de plano, a ultima fatura precisa estar paga.",
      );
    }

    const hasOpenInvoice = invoices.some((invoice) =>
      ["PENDENTE", "ATRASADO", "VENCIDO"].includes(
        String(invoice.status || "").toUpperCase(),
      ),
    );

    if (hasOpenInvoice) {
      throw new Error(
        "Regularize as faturas pendentes para liberar a troca de plano.",
      );
    }

    const referenceDate = latestInvoice.paidAt
      ? new Date(latestInvoice.paidAt)
      : new Date(latestInvoice.createdAt);
    const planChangeDeadline = new Date(referenceDate);
    planChangeDeadline.setDate(planChangeDeadline.getDate() + 30);

    if (now > planChangeDeadline) {
      throw new Error(
        `A troca de plano so pode ser solicitada em ate 30 dias apos o pagamento da fatura. Prazo encerrado em ${planChangeDeadline.toLocaleDateString("pt-BR")}.`,
      );
    }

    if (
      subscription.planChangeLockedUntil &&
      now < new Date(subscription.planChangeLockedUntil)
    ) {
      throw new Error(
        `Voce ja solicitou uma troca. Nova alteracao disponivel apos ${new Date(subscription.planChangeLockedUntil).toLocaleDateString("pt-BR")}.`,
      );
    }

    if (subscription.plan === plan) {
      throw new Error("Esse ja e o plano atual da assinatura.");
    }

    if (subscription.scheduledPlan) {
      throw new Error(
        "Ja existe uma troca de plano agendada para o proximo ciclo.",
      );
    }

    const nextPeriod = getNextMonthPeriod(now);

    const updated = await subscriptionRepository.update(restaurantId, {
      scheduledPlan: plan,
      scheduledPlanEffectiveMonth: nextPeriod.month,
      scheduledPlanEffectiveYear: nextPeriod.year,
      planChangeLockedUntil: nextPeriod.lockUntil,
    });

    return {
      ...updated,
      message: "Troca de plano agendada para o proximo ciclo de faturamento.",
    };
  }
}

export default new RequestPlanChangeService();
