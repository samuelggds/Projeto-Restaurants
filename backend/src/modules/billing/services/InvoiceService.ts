import billingRepository from "../repositories/BillingRepository.js";
import { PLAN_CONFIG } from "../config/planConfig.js";
import mercadoPagoService from "./MercadoPagoService.js";
import { addDays } from "../utils/dateUtils.js";

class InvoiceService {
  async execute({ restaurantId, month, year, startDate, endDate }) {
    // Busca a assinatura
    const subscription =
      await billingRepository.findSubscriptionByRestaurantId(restaurantId);

    if (!subscription) {
      throw new Error("Assinatura não encontrada.");
    }

    // Busca o plano
    const plan = PLAN_CONFIG[subscription.plan];

    if (!plan) {
      throw new Error("Plano inválido.");
    }

    // Evita criar duas invoices do mesmo mês
    const invoiceExists = await billingRepository.findInvoiceByMonth(
      restaurantId,
      month,
      year,
    );

    if (invoiceExists) {
      return invoiceExists;
    }

    // Busca pedidos pagos
    const orders = await billingRepository.findPaidOrdersByPeriod(
      restaurantId,
      startDate,
      endDate,
    );

    const systemFees = orders.reduce(
      (total, order) => total + Number(order.systemFee || 0),
      0,
    );

    const total = plan.monthlyFee + systemFees;

    const dueDate = addDays(new Date(), 30);

    // Cria invoice
    const invoice = await billingRepository.createInvoice({
      restaurantId,
      month,
      year,
      monthlyFee: plan.monthlyFee,
      systemFees,
      total,
      dueDate,
      status: "PENDENTE",
    });

    try {
      const payment = await mercadoPagoService.createPayment({
        invoiceId: invoice.id,
        title: `Plano ${subscription.plan}`,
        description: `Mensalidade ${month}/${year}`,
        amount: invoice.total,
      });

      const updatedInvoice = await billingRepository.updateInvoice(invoice.id, {
        paymentLink: payment.init_point,
      });

      console.log(`Link Mercado Pago criado para invoice ${invoice.id}`);

      return updatedInvoice;
    } catch (error) {
      console.error(
        "Erro ao criar pagamento Mercado Pago:",
        error?.message || error,
      );

      return invoice;
    }
  }
}

export default new InvoiceService();
