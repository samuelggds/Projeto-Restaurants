import { describe, expect, it } from 'vitest';
import {
  buildOrderPayload,
  buildOrderQuotePayload,
  resolveOrderType,
  validateCheckout,
} from './checkout';

const address = {
  address: 'Rua A',
  number: '123A',
  district: 'Centro',
  city: 'Fortaleza',
  state: 'ce',
  zipCode: '60000-000',
  complement: '',
};

describe('checkout', () => {
  it('resolve o canal do pedido', () => {
    expect(resolveOrderType(true, 'delivery')).toBe('MESA');
    expect(resolveOrderType(false, 'delivery')).toBe('DELIVERY');
    expect(resolveOrderType(false, 'pickup')).toBe('RETIRADA');
  });

  it('exige endereço completo no delivery', () => {
    expect(
      validateCheckout({
        type: 'DELIVERY',
        customerPhone: '85999999999',
        deliveryAddress: { ...address, city: '' },
        cepStatus: 'success',
        paymentMethod: 'pix',
      })?.title,
    ).toBe('Revise seu endereço');
  });

  it('impede pagamento na entrega para retirada', () => {
    expect(
      validateCheckout({
        type: 'RETIRADA',
        customerPhone: '',
        deliveryAddress: address,
        cepStatus: 'idle',
        paymentMethod: 'delivery_card',
      })?.title,
    ).toBe('Opção indisponível');
  });

  it('valida a identificação necessária para o pedido de visitante', () => {
    const base = {
      type: 'RETIRADA' as const,
      customerPhone: '(85) 99999-9999',
      customerName: 'Samuel Gomes',
      customerCpf: '529.982.247-25',
      requireGuestIdentity: true,
      deliveryAddress: address,
      cepStatus: 'idle' as const,
      paymentMethod: 'card' as const,
    };
    expect(validateCheckout({ ...base, customerName: '' })?.title).toBe('Informe seu nome');
    expect(validateCheckout({ ...base, customerCpf: '123' })?.title).toBe('CPF inválido');
    expect(validateCheckout({ ...base, customerPhone: '8599' })?.title).toBe('Celular inválido');
    expect(validateCheckout(base)).toBeNull();
  });

  it('não exige identidade do visitante no pedido por QR da mesa', () => {
    expect(
      validateCheckout({
        type: 'MESA',
        customerPhone: '',
        customerName: '',
        customerCpf: '',
        requireGuestIdentity: true,
        deliveryAddress: address,
        cepStatus: 'idle',
        paymentMethod: 'pix',
      }),
    ).toBeNull();
  });

  it('monta e normaliza o pedido', () => {
    const result = buildOrderPayload({
      restaurantId: 7,
      type: 'DELIVERY',
      paymentMethod: 'delivery_pix',
      cart: [{ productId: '12', name: 'Pizza', price: 39.9, quantity: 2, image: '' }],
      customer: { name: 'Samuel' },
      deliveryAddress: address,
    });
    expect(result).toMatchObject({
      payOnDelivery: true,
      resolvedPaymentMethod: 'PIX',
      payload: { state: 'CE', items: [{ productId: 12, quantity: 2 }] },
    });
  });

  it('adiciona o pedido à conta da mesa sem forjar uma forma de pagamento', () => {
    const order = buildOrderPayload({
      restaurantId: 7,
      type: 'MESA',
      settlementMode: 'TABLE_ACCOUNT',
      tableId: 12,
      cart: [{ productId: '12', name: 'Pizza', price: 39.9, quantity: 1, image: '' }],
      customer: {},
      deliveryAddress: address,
    });

    expect(order.payload).toMatchObject({
      restaurantId: 7,
      type: 'MESA',
      settlementMode: 'TABLE_ACCOUNT',
      tableId: 12,
    });
    expect(order.payload).not.toHaveProperty('paymentMethod');
    expect(order.payload).not.toHaveProperty('payOnDelivery');
    expect(order.payload).not.toHaveProperty('customerPhone');
  });

  it.each([
    ['pix', 'PIX'],
    ['card', 'CARTAO'],
  ] as const)(
    'mantém pagamento imediato por %s explícito sem enviar telefone vazio',
    (paymentMethod, expectedPaymentMethod) => {
      const order = buildOrderPayload({
        restaurantId: 7,
        type: 'MESA',
        settlementMode: 'PAY_NOW',
        paymentMethod,
        tableId: 12,
        cart: [{ productId: '12', name: 'Pizza', price: 39.9, quantity: 1, image: '' }],
        customer: {},
        deliveryAddress: address,
      });

      expect(order.payload).toMatchObject({
        settlementMode: 'PAY_NOW',
        paymentMethod: expectedPaymentMethod,
        payOnDelivery: false,
      });
      expect(order.payload).not.toHaveProperty('customerPhone');
    },
  );

  it('preserva um telefone válido quando o cliente o possui', () => {
    const order = buildOrderPayload({
      restaurantId: 7,
      type: 'MESA',
      settlementMode: 'PAY_NOW',
      paymentMethod: 'pix',
      tableId: 12,
      cart: [{ productId: '12', name: 'Pizza', price: 39.9, quantity: 1, image: '' }],
      customer: { phone: '(85) 99999-9999' },
      deliveryAddress: address,
    });

    expect(order.payload.customerPhone).toBe('(85) 99999-9999');
  });

  it('leva o resgate escolhido para a cotação e para o pedido sem enviar preço do navegador', () => {
    const cart = [{ productId: '12', name: 'Pizza', price: 1, quantity: 2, image: '' }];
    expect(
      buildOrderQuotePayload({
        restaurantId: 7,
        type: 'RETIRADA',
        cart,
        couponRedemptionId: 91,
      }),
    ).toEqual({
      restaurantId: 7,
      type: 'RETIRADA',
      couponRedemptionId: 91,
      items: [{ productId: 12, quantity: 2 }],
    });
    const order = buildOrderPayload({
      restaurantId: 7,
      type: 'RETIRADA',
      paymentMethod: 'pix',
      cart,
      customer: {},
      deliveryAddress: address,
      couponRedemptionId: 91,
    });
    expect(order.payload).toMatchObject({ couponRedemptionId: 91 });
    expect(order.payload.items[0]).not.toHaveProperty('price');
  });
});