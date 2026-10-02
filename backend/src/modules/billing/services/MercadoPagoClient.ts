import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago';
import { requirePlatformMercadoPagoAccessToken } from '../config/platformMercadoPago.js';

function createPlatformClient() {
  return new MercadoPagoConfig({
    accessToken: requirePlatformMercadoPagoAccessToken(),
  });
}

export function getPlatformPaymentClient() {
  return new Payment(createPlatformClient());
}

export function getPlatformPaymentRefundClient() {
  return new PaymentRefund(createPlatformClient());
}
