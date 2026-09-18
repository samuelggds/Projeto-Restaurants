import type {
  DirectCardPaymentOrder,
  DirectCardPaymentRequest,
  DirectCardPaymentPayload,
} from '../../payments/domain/DirectCardPaymentProvider.js';
import { getDirectCardPaymentProvider } from '../../payments/providers/directCardPaymentProviderRegistry.js';
import type { CardProvider } from '../../payments/providers/providerCatalog.js';
import { digits } from '../../payments/providers/cardProviderSupport.js';

export type { DirectCardPaymentPayload } from '../../payments/domain/DirectCardPaymentProvider.js';
export {
  CardPaymentDeclinedError,
  CardPaymentProviderRequestError,
  PaymentSplitConfigurationError,
} from '../../payments/domain/paymentErrors.js';
export { mercadoPagoDeclineDetails } from '../../payments/providers/mercadopago/MercadoPagoDirectCardProvider.js';

export function hasDirectCardPaymentPayload(payload: DirectCardPaymentPayload) {
  return Boolean(
    String(payload.cardToken || '').trim() ||
      String(payload.encryptedCard || '').trim() ||
      digits(payload.cardData?.number),
  );
}

class DirectOrderCardPaymentService {
  async execute(input: {
    provider: CardProvider;
    payload: DirectCardPaymentRequest;
    order: DirectCardPaymentOrder;
    successUrlBase: string;
  }) {
    return getDirectCardPaymentProvider(input.provider).create(
      input.payload,
      input.order,
      input.successUrlBase,
    );
  }
}

export default new DirectOrderCardPaymentService();
