import { z } from 'zod';
import { isValidCpf, normalizeWhatsappNumber } from '../../restaurantSettings/utils/adminSettingsValidation.js';

export const createNfcCustomerSchema = z.strictObject({
  name: z.string().trim().min(2, 'Informe o nome completo.').max(120),
  cpf: z.string().trim().min(11).max(18),
  phone: z.string().trim().min(10).max(24),
});
export const lookupNfcCpfSchema = z.strictObject({ cpf: z.string().trim().min(11).max(18) });
export const revokeNfcCardSchema = z.strictObject({
  reason: z.string().trim().min(5, 'Informe o motivo da revogação.').max(160),
});
export const nfcIdSchema = z.uuid();
export const nfcPageSchema = z.coerce.number().int().min(1).max(200).default(1);

export function normalizeNfcCpf(raw: string) {
  const cpf = raw.replace(/\D/g, '');
  if (!isValidCpf(cpf)) throw new NfcRegistrationError(422, 'Informe um CPF válido.');
  return cpf;
}

export function normalizeNfcPhone(raw: string) {
  const phone = normalizeWhatsappNumber(raw);
  if (!phone) throw new NfcRegistrationError(422, 'Informe um telefone com DDD.');
  return phone;
}

export class NfcRegistrationError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
  }
}
