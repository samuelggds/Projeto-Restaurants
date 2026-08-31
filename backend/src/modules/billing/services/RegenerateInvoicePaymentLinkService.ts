import billingRepository from '../repositories/BillingRepository.js';
import mercadoPagoService from './MercadoPagoService.js';
import { getPixAvailableAt, isInvoicePixAvailable } from '../utils/billingPaymentWindow.js';

type RegenerateInvoicePaymentLinkPayload = {
  invoiceId: number | string;
  restaurantId: number;
};

class RegenerateInvoicePaymentLinkService {
  async execute({ invoiceId, restaurantId }: RegenerateInvoicePaymentLinkPayload) {
    const invoice = await billingRepository.findInvoiceByIdAndRestaurantId(invoiceId, restaurantId);

    if (!invoice) {
      throw new Error('Fatura não encontrada para este restaurante.');
    }

    if (!['PENDENTE', 'ATRASADO'].includes(invoice.status)) {
      throw new Error('Esta mensalidade não está disponível para pagamento.');
    }

    if (!isInvoicePixAvailable(invoice)) {
      throw new Error(
        `O Pix desta mensalidade estará disponível em ${getPixAvailableAt(invoice.dueDate).toLocaleDateString('pt-BR')}.`,
      );
    }

    const payment = await mercadoPagoService.createPayment({
      invoiceId: invoice.id,
      title: `Mensalidade restaurante ${invoice.restaurantId}`,
      description: `Fatura ${invoice.month}/${invoice.year}`,
      amount: invoice.total,
      payerEmail: invoice.restaurant.email,
    });

    const updatedInvoice = await billingRepository.updateInvoicePaymentDetailsAndResetReconciliation(
      invoice.id,
      restaurantId,
      {
        paymentLink: payment.ticketUrl,
        paymentExternalId: payment.id,
        pixQrCode: payment.qrCode,
        pixQrCodeBase64: payment.qrCodeBase64,
        pixExpiresAt: payment.expiresAt ? new Date(payment.expiresAt) : null,
      },
    );

    return {
      invoice: updatedInvoice,
      paymentLink: payment.ticketUrl,
      pixQrCode: payment.qrCode,
      pixQrCodeBase64: payment.qrCodeBase64,
      pixExpiresAt: payment.expiresAt,
    };
  }
}

export default new RegenerateInvoicePaymentLinkService();
