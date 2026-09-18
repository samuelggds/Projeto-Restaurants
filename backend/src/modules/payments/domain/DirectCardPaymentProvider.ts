import type { CardProvider } from '../providers/providerCatalog.js';

export type DirectCardPaymentPayload = {
  cardToken?: string | null;
  cardPaymentMethodId?: string | null;
  encryptedCard?: string | null;
  cardData?: {
    number?: string | null;
    securityCode?: string | null;
  } | null;
  holderName?: string | null;
  holderTaxId?: string | null;
  expMonth?: number | string | null;
  expYear?: number | string | null;
  billingPostalCode?: string | null;
  billingAddressNumber?: string | null;
};

export type DirectCardPaymentRequest = DirectCardPaymentPayload & {
  userId?: number | string | null;
  paymentMethodId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerIp?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

export type DirectCardPaymentOrder = {
  id: number;
  publicId: string;
  restaurantId: number;
  total: number | string | { toString(): string } | null;
  systemFee?: number | string | { toString(): string } | null;
  restaurant?: { name?: string | null } | null;
};

export type DirectCardPaymentResult = {
  provider: CardProvider;
  sessionId: string;
  persistenceSessionId: string;
  checkoutUrl: string;
  paymentApproved: boolean;
};

export interface DirectCardPaymentProvider {
  readonly code: CardProvider;
  create(
    payload: DirectCardPaymentRequest,
    order: DirectCardPaymentOrder,
    successUrlBase: string,
  ): Promise<DirectCardPaymentResult>;
}
