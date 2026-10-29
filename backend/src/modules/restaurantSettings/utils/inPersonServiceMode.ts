/** Tenant-scoped service mode. Existing sessions are not retroactively canceled. */
export type InPersonServiceMode = 'QR_ONLY' | 'NFC_ONLY' | 'BOTH';

export function normalizeInPersonServiceMode(value: unknown): InPersonServiceMode {
  const mode = value === undefined ? 'QR_ONLY' : value;
  if (mode !== 'QR_ONLY' && mode !== 'NFC_ONLY' && mode !== 'BOTH') {
    throw new Error('Modalidade de atendimento presencial inválida.');
  }
  return mode;
}
