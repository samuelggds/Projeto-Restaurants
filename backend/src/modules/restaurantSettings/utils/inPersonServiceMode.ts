/**
 * Restaurant-level preference for in-person ordering.
 *
 * NFC modes are deliberately blocked until the card/customer/account/order/payment
 * lifecycle is implemented and homologated. A setting alone must never shut down
 * the working QR flow or imply that NFC payments are operational.
 */
export type InPersonServiceMode = 'QR_ONLY' | 'NFC_ONLY' | 'BOTH';

export function normalizeInPersonServiceMode(value: unknown): InPersonServiceMode {
  const mode = value === undefined ? 'QR_ONLY' : value;
  if (mode !== 'QR_ONLY' && mode !== 'NFC_ONLY' && mode !== 'BOTH') {
    throw new Error('Modalidade de atendimento presencial inválida.');
  }
  if (mode !== 'QR_ONLY') {
    throw new Error(
      'As modalidades NFC ainda não estão disponíveis. Continue utilizando o QR Code até a homologação.',
    );
  }
  return mode;
}
