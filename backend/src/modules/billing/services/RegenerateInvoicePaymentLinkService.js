import billingRepository from "../repositories/BillingRepository.js";
import mercadoPagoService from "./MercadoPagoService.js";

class RegenerateInvoicePaymentLinkService {
  async execute({ invoiceId, restaurantId }) {
    const invoice = await billingRepository.findInvoiceByIdAndRestaurantId(
      invoiceId,
      restaurantId,
    );

    if (!invoice) {
      throw new Error("Fatura não encontrada para este restaurante.");
    }

    const payment = await mercadoPagoService.createPayment({
      invoiceId: invoice.id,
      title: `Mensalidade restaurante ${invoice.restaurantId}`,
      description: `Fatura ${invoice.month}/${invoice.year}`,
      amount: invoice.total,
    });

    const updatedInvoice = await billingRepository.updateInvoice(invoice.id, {
      paymentLink: payment.init_point,
    });

    return {
      invoice: updatedInvoice,
      paymentLink: payment.init_point,
    };
  }
}

export default new RegenerateInvoicePaymentLinkService();
