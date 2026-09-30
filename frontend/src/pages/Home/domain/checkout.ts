import type { CartItem } from '../hooks/useCart';
import type { DeliveryAddress } from '../hooks/useDeliveryAddress';
import { validateDeliveryAddress } from './deliveryAddress';

export type CheckoutPaymentMethod =
  | 'pix'
  | 'open_finance_pix'
  | 'card'
  | 'debit_card'
  | 'delivery_pix'
  | 'delivery_card'
  | 'delivery_cash'
  | 'pickup_pix'
  | 'pickup_card'
  | 'pickup_cash';
export type OrderType = 'MESA' | 'DELIVERY' | 'RETIRADA';
export type TableOrderSettlementMode = 'TABLE_ACCOUNT' | 'PAY_NOW';
export type CheckoutIssue = { title: string; message: string };
export type ResolvedCheckoutPaymentMethod = 'PIX' | 'CARTAO' | 'DINHEIRO';

function optionalCustomerPhone(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^[1-9]\d{9,10}$/u.test(digits) ? digits : undefined;
}

export function isValidWhatsappOrderPhone(value: unknown) {
  return Boolean(optionalCustomerPhone(value));
}

export function formatBrazilPhoneInput(value: unknown) {
  const raw = String(value || '');
  const digits = raw.replace(/\D/g, '');
  if (digits.length > 11) return digits.slice(0, 13);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export const BRAZIL_PHONE_CHECKOUT_MESSAGE =
  'Use somente DDD + número, sem +55. Exemplo: (85) 99999-9999.';

export function whatsappOrderOptInStorageKey(restaurantId: number | null | undefined) {
  const normalizedRestaurantId = Number(restaurantId || 0);
  return Number.isSafeInteger(normalizedRestaurantId) && normalizedRestaurantId > 0
    ? `gastronexa:whatsapp-order-opt-in:${normalizedRestaurantId}`
    : '';
}

export function whatsappOrderPhoneStorageKey(restaurantId: number | null | undefined) {
  const normalizedRestaurantId = Number(restaurantId || 0);
  return Number.isSafeInteger(normalizedRestaurantId) && normalizedRestaurantId > 0
    ? `gastronexa:whatsapp-order-phone:${normalizedRestaurantId}`
    : '';
}

export function readWhatsappOrderOptIn(restaurantId: number | null | undefined) {
  const key = whatsappOrderOptInStorageKey(restaurantId);
  if (!key || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function writeWhatsappOrderOptIn(
  restaurantId: number | null | undefined,
  optedIn: boolean,
) {
  const key = whatsappOrderOptInStorageKey(restaurantId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, optedIn ? 'true' : 'false');
  } catch {
    // O checkout continua funcional mesmo se o navegador bloquear storage.
  }
}

export function readWhatsappOrderPhone(restaurantId: number | null | undefined) {
  const key = whatsappOrderPhoneStorageKey(restaurantId);
  if (!key || typeof window === 'undefined') return '';
  try {
    return String(window.localStorage.getItem(key) || '').trim();
  } catch {
    return '';
  }
}

export function writeWhatsappOrderPhone(
  restaurantId: number | null | undefined,
  phone: string,
) {
  const key = whatsappOrderPhoneStorageKey(restaurantId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, optionalCustomerPhone(phone) || '');
  } catch {
    // O checkout continua funcional mesmo se o navegador bloquear storage.
  }
}

type ValidationInput = {
  type: OrderType;
  customerPhone: unknown;
  customerName?: unknown;
  customerCpf?: unknown;
  requireGuestIdentity?: boolean;
  deliveryAddress: DeliveryAddress;
  cepStatus: 'idle' | 'loading' | 'success' | 'error';
  paymentMethod: CheckoutPaymentMethod;
};

export function resolveOrderType(mesaMode: boolean, orderType: 'delivery' | 'pickup'): OrderType {
  if (mesaMode) return 'MESA';
  return orderType === 'delivery' ? 'DELIVERY' : 'RETIRADA';
}

export function validateCheckout(input: ValidationInput): CheckoutIssue | null {
  const {
    type,
    customerPhone,
    customerName,
    requireGuestIdentity,
    deliveryAddress,
    cepStatus,
    paymentMethod,
  } = input;

  if (
    requireGuestIdentity &&
    type !== 'MESA' &&
    String(customerName || '').trim().length < 2
  ) {
    return { title: 'Informe seu nome', message: 'Digite seu nome para identificar o pedido.' };
  }

  if (type !== 'MESA' && !isValidWhatsappOrderPhone(customerPhone)) {
    return {
      title: 'Informe seu telefone',
      message: BRAZIL_PHONE_CHECKOUT_MESSAGE,
    };
  }

  if (type === 'DELIVERY') {
    const addressErrors = validateDeliveryAddress(deliveryAddress);
    const firstAddressError = Object.values(addressErrors)[0];
    if (firstAddressError) return { title: 'Revise seu endereço', message: firstAddressError };

    if (cepStatus !== 'success')
      return {
        title: 'Confirme o CEP',
        message: 'Informe um CEP válido e aguarde o preenchimento do endereço.',
      };
  }
  if (paymentMethod.startsWith('delivery_') && type !== 'DELIVERY')
    return {
      title: 'Opção indisponível',
      message: 'Pagar na entrega só está disponível para delivery.',
    };
  if (paymentMethod.startsWith('pickup_') && type !== 'RETIRADA')
    return {
      title: 'Opção indisponível',
      message: 'Pagar no restaurante só está disponível para pedidos de retirada.',
    };
  return null;
}

type PayloadInput = {
  restaurantId: number;
  type: OrderType;
  paymentMethod?: CheckoutPaymentMethod;
  settlementMode?: TableOrderSettlementMode;
  cart: CartItem[];
  tableId?: number | null;
  customer: Record<string, unknown>;
  deliveryAddress: DeliveryAddress;
  couponRedemptionId?: number | null;
};

export function buildOrderItems(cart: CartItem[]) {
  return cart.map((item) => {
    const selectedOptions = (item.selectedOptions || [])
      .map((selection) => ({
        groupId: Number(selection.groupId),
        optionIds: selection.optionIds.map(Number).filter((id) => Number.isInteger(id) && id > 0),
      }))
      .filter(
        (selection) =>
          Number.isInteger(selection.groupId) &&
          selection.groupId > 0 &&
          selection.optionIds.length > 0,
      );
    const optionIds = (item.selectedOptionIds || [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
    const ingredientIds = (item.ingredientIds || [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
    const observation = String(item.observation || '').trim();
    const optionQuantities = (item.optionQuantities || [])
      .map((entry) => ({ optionId: Number(entry.optionId), quantity: Number(entry.quantity) }))
      .filter(
        (entry) =>
          Number.isInteger(entry.optionId) &&
          entry.optionId > 0 &&
          Number.isInteger(entry.quantity) &&
          entry.quantity > 0,
      );
    const removedCompositionItemIds = (item.removedCompositionItemIds || [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
    const portions = (item.portions || [])
      .map((portion) => ({
        optionId: Number(portion.optionId),
        ...(String(portion.observation || '').trim()
          ? { observation: String(portion.observation).trim() }
          : {}),
      }))
      .filter((portion) => Number.isInteger(portion.optionId) && portion.optionId > 0);
    const comboSelections = (item.comboSelections || [])
      .map((group) => ({
        groupId: Number(group.groupId),
        items: group.items
          .map((entry) => ({
            optionId: Number(entry.optionId),
            quantity: Number(entry.quantity),
          }))
          .filter(
            (entry) =>
              Number.isInteger(entry.optionId) &&
              entry.optionId > 0 &&
              Number.isInteger(entry.quantity) &&
              entry.quantity > 0,
          ),
      }))
      .filter(
        (group) =>
          Number.isInteger(group.groupId) && group.groupId > 0 && group.items.length > 0,
      );
    return {
      productId: Number(item.productId),
      quantity: item.quantity,
      ...(optionIds.length ? { optionIds } : {}),
      ...(selectedOptions.length ? { selectedOptions } : {}),
      ...(ingredientIds.length && !optionIds.length ? { ingredientIds } : {}),
      ...(optionQuantities.length ? { optionQuantities } : {}),
      ...(removedCompositionItemIds.length ? { removedCompositionItemIds } : {}),
      ...(portions.length ? { portions } : {}),
      ...(comboSelections.length ? { comboSelections } : {}),
      ...(item.configurationVersion ? { configurationVersion: item.configurationVersion } : {}),
      ...(observation ? { observation } : {}),
    };
  });
}

export function buildOrderQuotePayload(input: {
  restaurantId: number;
  type: OrderType;
  cart: CartItem[];
  deliveryAddress?: DeliveryAddress;
  couponRedemptionId?: number | null;
}) {
  const deliveryAddress = input.deliveryAddress;

  return {
    restaurantId: input.restaurantId,
    type: input.type,
    items: buildOrderItems(input.cart),
    ...(input.couponRedemptionId ? { couponRedemptionId: input.couponRedemptionId } : {}),
    ...(input.type === 'DELIVERY' && deliveryAddress
      ? {
          address: deliveryAddress.address.trim(),
          number: deliveryAddress.number.trim(),
          district: deliveryAddress.district.trim(),
          city: deliveryAddress.city.trim(),
          state: deliveryAddress.state.trim().toUpperCase(),
        }
      : {}),
  };
}

export function buildOrderPayload(input: PayloadInput) {
  const {
    restaurantId,
    type,
    paymentMethod,
    settlementMode,
    cart,
    tableId,
    customer,
    deliveryAddress,
    couponRedemptionId,
  } = input;
  const isTableAccountOrder = type === 'MESA' && settlementMode === 'TABLE_ACCOUNT';
  const safePaymentMethod = paymentMethod || 'pix';
  const payAtPickup = type === 'RETIRADA' && safePaymentMethod.startsWith('pickup_');
  const payOnDelivery = !isTableAccountOrder && safePaymentMethod.startsWith('delivery_');
  const resolvedPaymentMethod: ResolvedCheckoutPaymentMethod = safePaymentMethod.includes('cash')
    ? 'DINHEIRO'
    : safePaymentMethod.includes('pix')
      ? 'PIX'
      : 'CARTAO';
  const customerPhone =
    optionalCustomerPhone(customer.phone) ||
    optionalCustomerPhone(readWhatsappOrderPhone(restaurantId));
  return {
    payload: {
      restaurantId,
      type,
      ...(type === 'MESA' && settlementMode ? { settlementMode } : {}),
      ...(!isTableAccountOrder && !payAtPickup
        ? {
            paymentMethod: resolvedPaymentMethod,
            payOnDelivery,
            payOnDeliveryMethod: payOnDelivery ? resolvedPaymentMethod : undefined,
          }
        : !isTableAccountOrder
          ? {
              payOnDelivery: false,
              payOnDeliveryMethod: resolvedPaymentMethod,
            }
          : {}),
      items: buildOrderItems(cart),
      ...(couponRedemptionId ? { couponRedemptionId } : {}),
      tableId: type === 'MESA' ? tableId || undefined : undefined,
      customerName: String(customer.name || 'Cliente'),
      customerCpf: String(customer.cpf || '').replace(/\D/g, '') || undefined,
      ...(customerPhone ? { customerPhone } : {}),
      ...(type !== 'MESA' ? { whatsappOptIn: readWhatsappOrderOptIn(restaurantId) } : {}),
      address: deliveryAddress.address.trim(),
      number: deliveryAddress.number.trim(),
      district: deliveryAddress.district.trim(),
      city: deliveryAddress.city.trim(),
      state: deliveryAddress.state.trim().toUpperCase(),
      zipCode: deliveryAddress.zipCode.trim(),
      complement: deliveryAddress.complement.trim(),
    },
    payOnDelivery,
    payAtPickup,
    resolvedPaymentMethod,
  } as const;
}
