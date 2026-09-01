import type { CartItem } from '../hooks/useCart';
import type { DeliveryAddress } from '../hooks/useDeliveryAddress';
import { validateDeliveryAddress } from './deliveryAddress';

export type CheckoutPaymentMethod = 'pix' | 'card' | 'delivery_pix' | 'delivery_card';
export type OrderType = 'MESA' | 'DELIVERY' | 'RETIRADA';
export type TableOrderSettlementMode = 'TABLE_ACCOUNT' | 'PAY_NOW';
export type CheckoutIssue = { title: string; message: string };

function optionalCustomerPhone(value: unknown) {
  const phone = String(value || '').trim();
  const digits = phone.replace(/\D/g, '');

  return digits.length >= 10 && digits.length <= 13 ? phone : undefined;
}

function isValidCpf(value: unknown) {
  const cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = cpf
      .slice(0, length)
      .split('')
      .reduce((total, item, index) => total + Number(item) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
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
    customerCpf,
    requireGuestIdentity,
    deliveryAddress,
    cepStatus,
    paymentMethod,
  } = input;
  if (requireGuestIdentity && type !== 'MESA') {
    if (String(customerName || '').trim().length < 2)
      return { title: 'Informe seu nome', message: 'Digite seu nome para identificar o pedido.' };
    if (!isValidCpf(customerCpf))
      return { title: 'CPF inválido', message: 'Informe um CPF válido com 11 dígitos.' };
    const phoneDigits = String(customerPhone || '').replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 13)
      return {
        title: 'Celular inválido',
        message: 'Informe um celular com DDD para acompanhar o pedido.',
      };
  }
  if (type === 'DELIVERY') {
    const addressErrors = validateDeliveryAddress(deliveryAddress);
    const firstAddressError = Object.values(addressErrors)[0];
    if (firstAddressError) return { title: 'Revise seu endereço', message: firstAddressError };

    const phoneDigits = String(customerPhone || '').replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 13)
      return {
        title: 'Celular inválido',
        message: 'Cadastre um celular com DDD para receber atualizações do pedido.',
      };
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
    return {
      productId: Number(item.productId),
      quantity: item.quantity,
      ...(optionIds.length ? { optionIds } : {}),
      ...(selectedOptions.length ? { selectedOptions } : {}),
      ...(ingredientIds.length && !optionIds.length ? { ingredientIds } : {}),
      ...(optionQuantities.length ? { optionQuantities } : {}),
      ...(removedCompositionItemIds.length ? { removedCompositionItemIds } : {}),
      ...(portions.length ? { portions } : {}),
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
  const payOnDelivery = !isTableAccountOrder && safePaymentMethod.startsWith('delivery_');
  const resolvedPaymentMethod = safePaymentMethod.includes('pix') ? 'PIX' : 'CARTAO';
  const customerPhone = optionalCustomerPhone(customer.phone);
  return {
    payload: {
      restaurantId,
      type,
      ...(type === 'MESA' && settlementMode ? { settlementMode } : {}),
      ...(!isTableAccountOrder
        ? {
            paymentMethod: resolvedPaymentMethod,
            payOnDelivery,
            payOnDeliveryMethod: payOnDelivery ? resolvedPaymentMethod : undefined,
          }
        : {}),
      items: buildOrderItems(cart),
      ...(couponRedemptionId ? { couponRedemptionId } : {}),
      tableId: type === 'MESA' ? tableId || undefined : undefined,
      customerName: String(customer.name || 'Cliente'),
      customerCpf: String(customer.cpf || '').replace(/\D/g, '') || undefined,
      ...(customerPhone ? { customerPhone } : {}),
      address: deliveryAddress.address.trim(),
      number: deliveryAddress.number.trim(),
      district: deliveryAddress.district.trim(),
      city: deliveryAddress.city.trim(),
      state: deliveryAddress.state.trim().toUpperCase(),
      zipCode: deliveryAddress.zipCode.trim(),
      complement: deliveryAddress.complement.trim(),
    },
    payOnDelivery,
    resolvedPaymentMethod,
  } as const;
}
