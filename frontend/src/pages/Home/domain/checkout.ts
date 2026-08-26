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

type ValidationInput = {
  type: OrderType;
  customerPhone: unknown;
  deliveryAddress: DeliveryAddress;
  cepStatus: 'idle' | 'loading' | 'success' | 'error';
  paymentMethod: CheckoutPaymentMethod;
};

export function resolveOrderType(mesaMode: boolean, orderType: 'delivery' | 'pickup'): OrderType {
  if (mesaMode) return 'MESA';
  return orderType === 'delivery' ? 'DELIVERY' : 'RETIRADA';
}

export function validateCheckout(input: ValidationInput): CheckoutIssue | null {
  const { type, customerPhone, deliveryAddress, cepStatus, paymentMethod } = input;
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
    return {
      productId: Number(item.productId),
      quantity: item.quantity,
      ...(optionIds.length ? { optionIds } : {}),
      ...(selectedOptions.length ? { selectedOptions } : {}),
      ...(ingredientIds.length && !optionIds.length ? { ingredientIds } : {}),
      ...(observation ? { observation } : {}),
    };
  });
}

export function buildOrderQuotePayload(input: {
  restaurantId: number;
  type: OrderType;
  cart: CartItem[];
  couponRedemptionId?: number | null;
}) {
  return {
    restaurantId: input.restaurantId,
    type: input.type,
    items: buildOrderItems(input.cart),
    ...(input.couponRedemptionId ? { couponRedemptionId: input.couponRedemptionId } : {}),
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
