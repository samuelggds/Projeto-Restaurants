import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { asaasRequest } from '../../restaurantSettings/services/asaasConnectionApi.js';

type Input = {
  restaurantId: number;
  orderId: number;
  total: number;
  paymentId: string;
  method: 'PIX' | 'CARTAO';
  accountId?: string;
};

class AsaasPaymentVerificationService {
  async execute(input: Input) {
    const settings = await restaurantSettingsRepository.findByRestaurantId(input.restaurantId);
    const token = String(settings?.asaasAccessToken || '').trim();
    if (!token) throw new Error('Credencial Asaas do restaurante indisponível para conciliação.');
    // account.id é da subconta; walletId identifica carteira e não faz parte de payment.
    if (
      input.accountId &&
      settings?.asaasAccountId &&
      settings.asaasAccountId !== input.accountId
    ) {
      return null;
    }
    const payment = await asaasRequest<{
      id?: string;
      externalReference?: string;
      value?: number;
      status?: string;
      billingType?: string;
      deleted?: boolean;
    }>(`/payments/${encodeURIComponent(input.paymentId)}`, token);
    const reference =
      input.method === 'PIX'
        ? `orderpix:${input.restaurantId}:${input.orderId}`
        : `ordercard:${input.orderId}:${input.restaurantId}`;
    if (
      payment.id !== input.paymentId ||
      payment.externalReference !== reference ||
      !Number.isFinite(Number(payment.value)) ||
      Math.round(Number(payment.value) * 100) !== Math.round(input.total * 100)
    )
      return null;
    const type = String(payment.billingType || '').toUpperCase();
    if (
      input.method === 'PIX'
        ? type !== 'PIX'
        : !['CREDIT_CARD', 'DEBIT_CARD', 'UNDEFINED'].includes(type)
    ) {
      return null;
    }
    const status = String(payment.status || '').toUpperCase();
    return {
      approved: payment.deleted !== true && ['CONFIRMED', 'RECEIVED'].includes(status),
      terminalUnpaid:
        payment.deleted === true || ['REFUNDED', 'DELETED', 'CANCELED'].includes(status),
      paymentId: input.paymentId,
      status,
    };
  }
}

export default new AsaasPaymentVerificationService();
