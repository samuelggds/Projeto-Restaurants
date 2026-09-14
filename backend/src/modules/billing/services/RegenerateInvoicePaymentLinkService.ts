import billingRepository from '../repositories/BillingRepository.js';
import mercadoPagoService from './MercadoPagoService.js';
import { getPixAvailableAt, isInvoicePixAvailable } from '../utils/billingPaymentWindow.js';

type RegenerateInvoicePaymentLinkPayload = {
  invoiceId: number | string;
  restaurantId: number;
};

function hasReusablePix(invoice: {
  paymentLink?: string | null;
  paymentExternalId?: string | null;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
  pixExpiresAt?: Date | null;
}) {
  return Boolean(
    invoice.paymentExternalId &&
    invoice.pixQrCode &&
    invoice.pixQrCodeBase64 &&
    invoice.pixExpiresAt &&
    new Date(invoice.pixExpiresAt).getTime() > Date.now(),
  );
}

function pixIdempotencyKey(invoice: { id: number; paymentExternalId?: string | null }) {
  const generation = String(invoice.paymentExternalId || 'initial').replace(/[^a-zA-Z0-9_-]/g, '-');
  return `invoice-pix-${invoice.id}-${generation}`.slice(0, 120);
}

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

    if (hasReusablePix(invoice)) {
      return {
        invoice,
        paymentLink: invoice.paymentLink,
        pixQrCode: invoice.pixQrCode,
        pixQrCodeBase64: invoice.pixQrCodeBase64,
        pixExpiresAt: invoice.pixExpiresAt?.toISOString() || null,
        reused: true,
      };
    }

    const payment = await mercadoPagoService.createPayment({
      invoiceId: invoice.id,
      title: `Mensalidade restaurante ${invoice.restaurantId}`,
      description: `Fatura ${invoice.month}/${invoice.year}`,
      amount: invoice.total,
      payerEmail: invoice.restaurant.email,
      idempotencyKey: pixIdempotencyKey(invoice),
    });

    const updatedInvoice =
      await billingRepository.updateInvoicePaymentDetailsAndResetReconciliation(
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
      reused: false,
    };
  }
}

export { hasReusablePix, pixIdempotencyKey };
export default new RegenerateInvoicePaymentLinkService();
