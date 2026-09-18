import type { DirectCardPaymentProvider } from '../domain/DirectCardPaymentProvider.js';
import { CardPaymentDeclinedError } from '../domain/paymentErrors.js';
import asaasProvider from './asaas/AsaasDirectCardProvider.js';
import mercadoPagoProvider from './mercadopago/MercadoPagoDirectCardProvider.js';
import pagBankProvider from './pagbank/PagBankDirectCardProvider.js';
import { CARD_PROVIDERS, type CardProvider } from './providerCatalog.js';

const providers = new Map<CardProvider, DirectCardPaymentProvider>([
  [CARD_PROVIDERS.MERCADO_PAGO, mercadoPagoProvider],
  [CARD_PROVIDERS.PAGBANK, pagBankProvider],
  [CARD_PROVIDERS.ASAAS, asaasProvider],
]);

export function getDirectCardPaymentProvider(provider: CardProvider) {
  const implementation = providers.get(provider);
  if (!implementation) {
    throw new CardPaymentDeclinedError(
      'Este provedor não aceita checkout transparente de cartão.',
    );
  }
  return implementation;
}
