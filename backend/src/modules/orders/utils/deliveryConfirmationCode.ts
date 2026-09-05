import crypto from 'node:crypto';

function getSecret() {
  const secret = String(
    process.env.DELIVERY_CONFIRMATION_CODE_SECRET ||
      process.env.PAYMENT_PIN_SECRET ||
      process.env.JWT_MFA_SECRET ||
      process.env.JWT_SECRET ||
      'development-delivery-confirmation-secret',
  ).trim();

  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error(
      'DELIVERY_CONFIRMATION_CODE_SECRET deve ter pelo menos 32 caracteres em produção.',
    );
  }

  return secret;
}

type DeliveryConfirmationCodeInput = {
  orderId: number;
  publicId: string;
  deliveryStartedAt: Date | string;
};

function payloadFor({ orderId, publicId, deliveryStartedAt }: DeliveryConfirmationCodeInput) {
  const startedAt = new Date(deliveryStartedAt);
  if (!Number.isInteger(orderId) || orderId <= 0 || !publicId || Number.isNaN(startedAt.getTime())) {
    throw new Error('Não foi possível gerar o código de entrega para este pedido.');
  }

  return `${orderId}:${publicId}:${startedAt.toISOString()}`;
}

export function generateDeliveryConfirmationCode(input: DeliveryConfirmationCodeInput) {
  const digest = crypto.createHmac('sha256', getSecret()).update(payloadFor(input)).digest();
  const value = digest.readUInt32BE(0) % 10_000;
  return String(value).padStart(4, '0');
}

export function verifyDeliveryConfirmationCode(
  providedCode: string,
  input: DeliveryConfirmationCodeInput,
) {
  const normalized = String(providedCode || '').replace(/\D/g, '');
  if (!/^\d{4}$/.test(normalized)) return false;

  const expected = generateDeliveryConfirmationCode(input);
  const providedBuffer = Buffer.from(normalized);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
