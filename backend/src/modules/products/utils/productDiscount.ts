type ProductDiscountLike = {
  kind?: 'FIXED' | 'PERCENTAGE' | string;
  value?: unknown;
  label?: string | null;
  active?: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
} | null;

type ProductPricingInput = {
  price: unknown;
  discount?: ProductDiscountLike;
};

export function roundMoney(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error('Valor monetário inválido.');
  }

  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function validDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveProductBasePricing(product: ProductPricingInput, now = new Date()) {
  const originalBasePrice = Math.max(roundMoney(product.price), 0);
  const discount = product.discount;
  const startsAt = validDate(discount?.startsAt);
  const endsAt = validDate(discount?.endsAt);
  const isWithinPeriod = (!startsAt || startsAt <= now) && (!endsAt || endsAt > now);
  const configuredValue = Number(discount?.value || 0);
  const kind = String(discount?.kind || '').toUpperCase();
  const hasValidConfiguration =
    discount?.active === true &&
    isWithinPeriod &&
    Number.isFinite(configuredValue) &&
    configuredValue > 0 &&
    (kind === 'FIXED' || kind === 'PERCENTAGE');

  let discountAmount = 0;
  if (hasValidConfiguration) {
    discountAmount =
      kind === 'PERCENTAGE'
        ? roundMoney(originalBasePrice * (Math.min(configuredValue, 100) / 100))
        : roundMoney(Math.min(configuredValue, originalBasePrice));
  }

  const effectiveBasePrice = roundMoney(Math.max(originalBasePrice - discountAmount, 0));
  const discountPercentage =
    originalBasePrice > 0 ? roundMoney((discountAmount / originalBasePrice) * 100) : 0;
  const active = discountAmount > 0;
  const configuredLabel = String(discount?.label || '').trim();

  return {
    originalBasePrice,
    effectiveBasePrice,
    discountAmount,
    discountPercentage,
    badgeLabel: active
      ? configuredLabel || `${Math.max(Math.round(discountPercentage), 1)}% OFF`
      : null,
    active,
    endsAt: active && endsAt ? endsAt : null,
  };
}

