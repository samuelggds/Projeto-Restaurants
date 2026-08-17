import { MercadoPagoConfig, Payment } from 'mercadopago';
import { requirePlatformMercadoPagoAccessToken } from '../config/platformMercadoPago.js';

function createPlatformClient() {
  return new MercadoPagoConfig({
    accessToken: requirePlatformMercadoPagoAccessToken(),
  });
}

export function getPlatformPaymentClient() {
  return new Payment(createPlatformClient());
}
