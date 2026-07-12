import billingRepository from "../repositories/BillingRepository.js";
import { PLAN_CONFIG } from "../config/planConfig.js";
import mercadoPagoService from "./MercadoPagoService.js";
import { addDays } from "../utils/dateUtils.js";
class InvoiceService {
    async execute({ restaurantId, month, year, startDate, endDate, }) {
        // Busca a assinatura
        const subscription = await billingRepository.findSubscriptionByRestaurantId(restaurantId);
        if (!subscription) {
            throw new Error("Assinatura não encontrada.");
        }
        let activePlan = subscription.plan;
        const shouldApplyScheduledPlan = subscription.scheduledPlan &&
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
            throw new Error("Plano inválido.");
        }
        // Evita criar duas invoices do mesmo mês
        const invoiceExists = await billingRepository.findInvoiceByMonth(restaurantId, month, year);
        if (invoiceExists) {
            return invoiceExists;
        }
        const total = plan.monthlyFee;
        const trialEndsAtDate = subscription.trialEndsAt
            ? new Date(subscription.trialEndsAt)
            : null;
        const dueDate = subscription.status === "TESTE" &&
            trialEndsAtDate &&
            !Number.isNaN(trialEndsAtDate.getTime())
            ? trialEndsAtDate
            : addDays(new Date(), 30);
        // Cria invoice
        const invoice = await billingRepository.createInvoice({
            restaurantId,
            month,
            year,
            monthlyFee: plan.monthlyFee,
            systemFees: 0,
            total,
            dueDate,
            status: "PENDENTE",
        });
        try {
            const payment = await mercadoPagoService.createPayment({
                invoiceId: invoice.id,
                title: `Plano ${activePlan}`,
                description: `Mensalidade ${month}/${year}`,
                amount: invoice.total,
            });
            const updatedInvoice = await billingRepository.updateInvoice(invoice.id, {
                paymentLink: payment.init_point,
            });
            console.log(`Link Mercado Pago criado para invoice ${invoice.id}`);
            return updatedInvoice;
        }
        catch (error) {
            console.error("Erro ao criar pagamento Mercado Pago:", error instanceof Error ? error.message : String(error));
            return invoice;
        }
    }
}
export default new InvoiceService();
