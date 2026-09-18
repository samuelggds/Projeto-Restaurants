import { matchesOrderPaymentEvidence } from '../../../orders/utils/paymentEvidence.js';
import { getPagBankAccessToken } from '../../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';
import type {
  DirectCardPaymentOrder,
  DirectCardPaymentProvider,
  DirectCardPaymentRequest,
} from '../../domain/DirectCardPaymentProvider.js';
import {
  CardPaymentDeclinedError,
  PaymentSplitConfigurationError,
} from '../../domain/paymentErrors.js';
import {
  amount,
  digits,
  internalReturnUrl,
  payerEmail,
  readResponse,
  safeProviderMessage,
} from '../cardProviderSupport.js';
import { pagBankApiBaseUrl } from '../pagBankCheckout.js';
import { CARD_PROVIDERS } from '../providerCatalog.js';

export class PagBankDirectCardProvider implements DirectCardPaymentProvider {
  readonly code = CARD_PROVIDERS.PAGBANK;

  async create(
    payload: DirectCardPaymentRequest,
    order: DirectCardPaymentOrder,
    successUrlBase: string,
  ) {
    const encryptedCard = String(payload.encryptedCard || '').trim();
    if (!encryptedCard) {
      throw new CardPaymentDeclinedError('Informe os dados do cartão para continuar.');
    }

    const systemFee = Number(order.systemFee || 0);
    if (systemFee > 0) {
      throw new PaymentSplitConfigurationError(
        'O split do PagBank ainda não está configurado para cobranças com cartão. O pagamento foi bloqueado para evitar cobrar sem repassar a taxa da plataforma.',
      );
    }

    const token = await getPagBankAccessToken(order.restaurantId);
    const totalCents = Math.round(amount(order.total) * 100);
    const reference = `ordercard:${order.id}:${order.restaurantId}`;
    const taxId = digits(payload.holderTaxId);
    const email = await payerEmail(payload, order);
    const backendUrl = String(process.env.BACKEND_URL || '')
      .trim()
      .replace(/\/+$/, '');
    const notificationUrl = backendUrl
      ? `${backendUrl}/orders/webhook/pagbank?restaurantId=${order.restaurantId}`
      : '';

    const response = await fetch(`${pagBankApiBaseUrl()}/orders`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-idempotency-key': `order-card-${order.restaurantId}-${order.id}`,
      },
      body: JSON.stringify({
        reference_id: reference,
        customer: {
          name: String(payload.customerName || payload.holderName || 'Cliente').trim(),
          email,
          ...(taxId ? { tax_id: taxId } : {}),
        },
        items: [
          {
            reference_id: String(order.id),
            name: `Pedido #${order.id}`,
            quantity: 1,
            unit_amount: totalCents,
          },
        ],
        charges: [
          {
            reference_id: reference,
            description: `Pedido #${order.id}`,
            amount: { value: totalCents, currency: 'BRL' },
            payment_method: {
              type: 'CREDIT_CARD',
              installments: 1,
              capture: true,
              card: { encrypted: encryptedCard },
              holder: {
                name: String(payload.holderName || payload.customerName || 'Cliente').trim(),
                ...(taxId ? { tax_id: taxId } : {}),
              },
            },
          },
        ],
        ...(notificationUrl ? { notification_urls: [notificationUrl] } : {}),
      }),
    });
    const body = await readResponse(response);

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw new CardPaymentDeclinedError(
          safeProviderMessage(body, 'O PagBank não autorizou este cartão.'),
        );
      }
      throw new Error('Falha temporária ao processar o cartão no PagBank.');
    }

    const charges = Array.isArray(body.charges) ? body.charges : [];
    const charge = (charges[0] || {}) as Record<string, unknown>;
    const chargeId = String(charge.id || '').trim();
    const status = String(charge.status || '').trim().toUpperCase();
    const chargeAmount =
      typeof charge.amount === 'object' && charge.amount !== null
        ? (charge.amount as Record<string, unknown>)
        : {};
    const paymentMethod =
      typeof charge.payment_method === 'object' && charge.payment_method !== null
        ? (charge.payment_method as Record<string, unknown>)
        : {};

    if (!/^CHAR_[\w-]+$/.test(chargeId)) {
      throw new Error('PagBank não retornou a identificação da cobrança.');
    }
    if (['DECLINED', 'CANCELED', 'CANCELLED'].includes(status)) {
      throw new CardPaymentDeclinedError('O PagBank não autorizou este cartão.');
    }

    const approved =
      status === 'PAID' &&
      String(body.reference_id || '').trim() === reference &&
      String(charge.reference_id || '').trim() === reference &&
      String(paymentMethod.type || '').toUpperCase() === 'CREDIT_CARD' &&
      matchesOrderPaymentEvidence({
        expectedAmount: order.total,
        providerAmount: chargeAmount.value,
        providerAmountUnit: 'MINOR',
        providerCurrency: chargeAmount.currency,
      });

    return {
      provider: this.code,
      sessionId: chargeId,
      persistenceSessionId: `pagbank_tx:${chargeId}`,
      checkoutUrl: internalReturnUrl(successUrlBase, order, approved ? 'success' : 'pending'),
      paymentApproved: approved,
    };
  }
}

export default new PagBankDirectCardProvider();
