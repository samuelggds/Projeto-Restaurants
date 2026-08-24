const ALLOWED_FONT_FAMILIES = new Set(['Inter', 'Manrope', 'DM Sans']);

export function normalizeNonNegativeMoney(value: unknown, label: string, fallback = 0) {
  const normalized =
    value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${label} deve ser um valor válido e não negativo.`);
  }
  return Math.round(normalized * 100) / 100;
}

export function normalizeOptionalNonNegativeMoney(value: unknown, label: string) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = normalizeNonNegativeMoney(value, label);
  return normalized > 0 ? normalized : null;
}

export function normalizeStrictBoolean(value: unknown, label: string, fallback: boolean) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new Error(`${label} deve ser verdadeiro ou falso.`);
  return value;
}

export function normalizeIntegerInRange(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  fallback?: number,
) {
  const candidate = value === undefined || value === null || value === '' ? fallback : value;
  const normalized = Number(candidate);
  if (!Number.isInteger(normalized) || normalized < minimum || normalized > maximum) {
    throw new Error(`${label} deve ser um número inteiro entre ${minimum} e ${maximum}.`);
  }
  return normalized;
}

export function normalizePrimaryColor(value: unknown, fallback = '#c95d3d') {
  const normalized = String(value ?? fallback).trim();
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error('Cor principal inválida. Use o formato hexadecimal #RRGGBB.');
  }
  return normalized.toLowerCase();
}

export function normalizeFontFamily(value: unknown, fallback = 'Inter') {
  const normalized = String(value ?? fallback).trim() || fallback;
  if (!ALLOWED_FONT_FAMILIES.has(normalized)) {
    throw new Error('Fonte inválida. Escolha Inter, Manrope ou DM Sans.');
  }
  return normalized;
}

export function normalizeOptionalText(value: unknown, label: string, maxLength: number) {
  const normalized = String(value ?? '').trim();
  if (normalized.length > maxLength) {
    throw new Error(`${label} pode ter no máximo ${maxLength} caracteres.`);
  }
  return normalized || null;
}

export function normalizeSocialReference(value: unknown, label: string) {
  const normalized = normalizeOptionalText(value, label, 2048);
  if (!normalized) return null;
  if (/^javascript:/i.test(normalized)) throw new Error(`${label} inválido.`);
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
    } catch {
      throw new Error(`${label} inválido.`);
    }
    return normalized;
  }
  if (!/^[A-Za-z0-9@._/-]+$/.test(normalized)) {
    throw new Error(`${label} inválido. Use o nome de usuário ou a URL completa do perfil.`);
  }
  return normalized;
}

export function normalizeWhatsappNumber(value: unknown) {
  const normalized = String(value ?? '').replace(/\D/g, '');
  if (normalized && !/^\d{10,15}$/.test(normalized)) {
    throw new Error('Número do WhatsApp inválido. Informe DDI, DDD e número.');
  }
  return normalized || null;
}

export function isValidCpf(value: unknown) {
  const cpf = String(value ?? '').replace(/\D/g, '');
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  const digit = (base: string, factor: number) => {
    const sum = base
      .split('')
      .reduce((total, number, index) => total + Number(number) * (factor - index), 0);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return cpf.endsWith(`${digit(cpf.slice(0, 9), 10)}${digit(cpf.slice(0, 10), 11)}`);
}

export function isValidCnpj(value: unknown) {
  const cnpj = String(value ?? '').replace(/\D/g, '');
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
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
