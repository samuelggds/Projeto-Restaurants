import { normalizeRestaurantImage } from '../../restaurantSettings/utils/normalizeRestaurantImage.js';

export const DEFAULT_BANNER_BUTTON_LABEL = 'Ver cardápio';

type OptionalTextOptions = {
  field: string;
  maxLength: number;
};

export function normalizeBannerId(value: number | string, field = 'Banner') {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${field} inválido.`);
  }
  return normalized;
}

export function normalizeBannerTitle(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('O título do banner é obrigatório.');
  }

  const normalized = value.trim();
  if (!normalized) throw new Error('O título do banner é obrigatório.');
  if (normalized.length > 80) {
    throw new Error('O título pode ter no máximo 80 caracteres.');
  }
  return normalized;
}

export function normalizeOptionalBannerText(
  value: unknown,
  { field, maxLength }: OptionalTextOptions,
) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`${field} deve ser um texto válido.`);
  }

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new Error(`${field} pode ter no máximo ${maxLength} caracteres.`);
  }
  return normalized;
}

export function normalizeBannerImage(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('A imagem do banner é obrigatória.');
  }
  const normalized = normalizeRestaurantImage(value);
  if (!normalized) throw new Error('A imagem do banner é obrigatória.');
  return normalized;
}

export function normalizeBannerActive(value: unknown, fallback?: boolean) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'boolean') {
    throw new Error('O estado do banner deve ser verdadeiro ou falso.');
  }
  return value;
}

export function normalizeBannerPosition(value: unknown, fallback?: number) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('A posição do banner deve ser um número inteiro maior ou igual a zero.');
  }
  return value;
}
