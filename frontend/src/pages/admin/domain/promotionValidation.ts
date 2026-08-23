import type {
  AdminCoupon,
  AdminProduct,
  CouponPayload,
  DiscountType,
  ProductDiscountPayload,
} from '../types';

export type ProductDiscountDraft = {
  productId: string;
  type: DiscountType;
  value: string;
  badgeLabel: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
};

export type CouponDraft = {
  id?: string;
  code: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discount: string;
  minimumSubtotal: string;
  maxDiscount: string;
  loyaltyPurchasesRequired: string;
  perCustomerLimit: string;
  redemptionValidityDays: string;
  active: boolean;
  expiration: string;
};

function validDate(value: string) {
  return !value || Number.isFinite(new Date(value).getTime());
}

export function optionalIsoDate(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function calculateDiscountedPrice(price: number, type: DiscountType, value: number) {
  const discount = type === 'PERCENTAGE' ? price * (value / 100) : value;
  return Math.max(0, Number((price - discount).toFixed(2)));
}

export function validateProductDiscountDraft(
  draft: ProductDiscountDraft,
  product?: Pick<AdminProduct, 'price'>,
) {
  const errors: string[] = [];
  const value = Number(draft.value);
  if (!draft.productId) errors.push('Escolha o produto que receberá o desconto.');
  if (!Number.isFinite(value) || value <= 0) errors.push('Informe um desconto maior que zero.');
  if (draft.type === 'PERCENTAGE' && value > 100)
    errors.push('O desconto percentual não pode ultrapassar 100%.');
  if (draft.type === 'FIXED' && product && value > product.price)
    errors.push('O desconto em reais não pode ultrapassar o preço base do produto.');
  const badgeLabel = draft.badgeLabel.trim();
  if (badgeLabel.length < 2) errors.push('Informe o texto que aparecerá no selo da oferta.');
  if (badgeLabel.length > 32) errors.push('O selo da oferta deve ter no máximo 32 caracteres.');
  if (!validDate(draft.startsAt) || !validDate(draft.endsAt))
    errors.push('Revise as datas de início e término da oferta.');
  if (
    draft.startsAt &&
    draft.endsAt &&
    new Date(draft.endsAt).getTime() <= new Date(draft.startsAt).getTime()
  ) {
    errors.push('O término da oferta deve acontecer depois do início.');
  }
  return errors;
}

export function productDiscountPayload(draft: ProductDiscountDraft): ProductDiscountPayload {
  return {
    type: draft.type,
    value: Number(draft.value),
    badgeLabel: draft.badgeLabel.trim(),
    active: draft.active,
    ...(draft.startsAt ? { startsAt: optionalIsoDate(draft.startsAt) } : {}),
    ...(draft.endsAt ? { endsAt: optionalIsoDate(draft.endsAt) } : {}),
  };
}

export function normalizeCouponCode(value: string) {
  return value
    .trim()
    .toLocaleUpperCase('pt-BR')
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 30);
}

export function validateCouponDraft(draft: CouponDraft) {
  const errors: string[] = [];
  const discount = Number(draft.discount);
  const minimumSubtotal = Number(draft.minimumSubtotal);
  const maxDiscount = draft.maxDiscount ? Number(draft.maxDiscount) : null;
  const purchases = Number(draft.loyaltyPurchasesRequired);
  const limit = Number(draft.perCustomerLimit);
  const validityDays = Number(draft.redemptionValidityDays);
  if (!/^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(draft.code.trim()))
    errors.push('Use um código de 3 a 30 caracteres, com letras, números, hífen ou sublinhado.');
  if (draft.title.trim().length < 3) errors.push('Informe um título claro para o benefício.');
  if (draft.title.trim().length > 80) errors.push('O título deve ter no máximo 80 caracteres.');
  if (draft.description.trim().length > 240)
    errors.push('A descrição deve ter no máximo 240 caracteres.');
  if (!Number.isFinite(discount) || discount <= 0)
    errors.push('Informe um valor de desconto maior que zero.');
  if (draft.discountType === 'PERCENTAGE' && discount >= 100)
    errors.push('O desconto percentual deve ser menor que 100%.');
  if (!Number.isFinite(minimumSubtotal) || minimumSubtotal < 0)
    errors.push('O pedido mínimo não pode ser negativo.');
  if (maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount <= 0))
    errors.push('O limite máximo do desconto deve ser maior que zero.');
  if (!Number.isInteger(purchases) || purchases < 1 || purchases > 999)
    errors.push('A meta deve ficar entre 1 e 999 pedidos pagos e entregues.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 99)
    errors.push('O limite de cupons guardados deve ficar entre 1 e 99.');
  if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 365)
    errors.push('A validade de cada cupom resgatado deve ficar entre 1 e 365 dias.');
  if (!validDate(draft.expiration)) errors.push('Informe uma data de validade válida.');
  if (
    draft.active &&
    draft.expiration &&
    validDate(draft.expiration) &&
    Date.parse(draft.expiration) <= Date.now()
  )
    errors.push('A data de encerramento de uma campanha ativa precisa estar no futuro.');
  return errors;
}

export function couponPayload(draft: CouponDraft): CouponPayload {
  return {
    code: normalizeCouponCode(draft.code),
    title: draft.title.trim(),
    description: draft.description.trim(),
    discountType: draft.discountType,
    discount: Number(draft.discount),
    minimumSubtotal: Number(draft.minimumSubtotal || 0),
    maxDiscount: draft.maxDiscount ? Number(draft.maxDiscount) : null,
    loyaltyPurchasesRequired: Number(draft.loyaltyPurchasesRequired),
    perCustomerLimit: Number(draft.perCustomerLimit),
    redemptionValidityDays: Number(draft.redemptionValidityDays),
    active: draft.active,
    expiration: draft.expiration ? optionalIsoDate(draft.expiration) : null,
  };
}

export function couponToDraft(coupon: AdminCoupon): CouponDraft {
  return {
    id: coupon.id,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description,
    discountType: coupon.discountType,
    discount: String(coupon.discount),
    minimumSubtotal: String(coupon.minimumSubtotal),
    maxDiscount: coupon.maxDiscount == null ? '' : String(coupon.maxDiscount),
    loyaltyPurchasesRequired: String(coupon.loyaltyPurchasesRequired),
    perCustomerLimit: String(coupon.perCustomerLimit),
    redemptionValidityDays: String(coupon.redemptionValidityDays || 30),
    active: coupon.active,
    expiration: toDateTimeLocal(coupon.expiration),
  };
}
