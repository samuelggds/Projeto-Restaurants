import type { AdminSettings } from '../types';

export type BusinessSettingsErrors = Partial<
  Record<'companyLegalName' | 'companyDocument' | 'whatsapp' | 'businessEmail', string>
>;

const digits = (value: string) => value.replace(/\D/g, '');

export function isValidCnpj(value: string) {
  const cnpj = digits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const digit = (base: string, weights: number[]) => {
    const sum = base
      .split('')
      .reduce((total, number, index) => total + Number(number) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = digit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(cnpj.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${first}${second}`);
}

export function isValidCpf(value: string) {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const digit = (base: string, factor: number) => {
    const sum = base
      .split('')
      .reduce((total, number, index) => total + Number(number) * (factor - index), 0);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return cpf.endsWith(`${digit(cpf.slice(0, 9), 10)}${digit(cpf.slice(0, 10), 11)}`);
}

export function validateBusinessSettings(settings: AdminSettings): BusinessSettingsErrors {
  const errors: BusinessSettingsErrors = {};
  if (settings.companyLegalName.trim().length < 2)
    errors.companyLegalName = 'Informe a razão social.';
  if (
    settings.legalDocumentType === 'CPF'
      ? !isValidCpf(settings.companyDocument)
      : !isValidCnpj(settings.companyDocument)
  )
    errors.companyDocument = `Informe um ${settings.legalDocumentType} válido.`;
  if (!/^\d{10,13}$/.test(digits(settings.whatsapp || settings.businessPhone)))
    errors.whatsapp = 'Informe o número comercial com DDD; DDI também é aceito.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.businessEmail.trim()))
    errors.businessEmail = 'Informe um e-mail comercial válido.';
  return errors;
}

export function formatCnpj(value: string) {
  return digits(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
export function formatCpf(value: string) {
  return digits(value)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})(\d)/, '$1-$2');
}
export function formatBusinessPhone(value: string) {
  const raw = digits(value).slice(0, 13);
  const phone = raw.startsWith('55') && raw.length > 11 ? raw.slice(2) : raw;
  const formatted =
    phone.length > 10
      ? phone.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3')
      : phone.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  return raw.startsWith('55') && raw.length > 11 ? `+55 ${formatted}` : formatted;
}
