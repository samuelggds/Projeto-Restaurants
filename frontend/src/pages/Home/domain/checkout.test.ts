import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildOrderPayload,
  buildOrderQuotePayload,
  readWhatsappOrderOptIn,
  readWhatsappOrderPhone,
  resolveOrderType,
  validateCheckout,
  writeWhatsappOrderOptIn,
  writeWhatsappOrderPhone,
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
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('resolve o canal do pedido', () => {
    expect(resolveOrderType(true, 'delivery')).toBe('MESA');
    expect(resolveOrderType(false, 'delivery')).toBe('DELIVERY');
    expect(resolveOrderType(false, 'pickup')).toBe('RETIRADA');
  });

  it('exige endereço completo no delivery', () => {
    expect(
      validateCheckout({
        type: 'DELIVERY',
        customerPhone: '',
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

  it('restringe pagar no restaurante à retirada sem exigir telefone antigo do perfil', () => {
    expect(
      validateCheckout({
        type: 'DELIVERY',
        customerPhone: '',
        deliveryAddress: address,
        cepStatus: 'success',
        paymentMethod: 'pickup_pix',
      })?.title,
    ).toBe('Opção indisponível');

    expect(
      validateCheckout({
        type: 'RETIRADA',
        customerPhone: '',
        deliveryAddress: address,
        cepStatus: 'idle',
        paymentMethod: 'pickup_cash',
      }),
    ).toBeNull();
  });

  it('visitante precisa apenas informar o nome no frontend, sem CPF', () => {
    const base = {
      type: 'RETIRADA' as const,
      customerPhone: '',
      customerName: 'Samuel Gomes',
      customerCpf: '',
      requireGuestIdentity: true,
      deliveryAddress: address,
      cepStatus: 'idle' as const,
      paymentMethod: 'card' as const,
    };

    expect(validateCheckout({ ...base, customerName: '' })?.title).toBe('Informe seu nome');
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
    writeWhatsappOrderPhone(7, '(85) 99999-9999');
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
      payload: {
        state: 'CE',
        customerPhone: '(85) 99999-9999',
        items: [{ productId: 12, quantity: 2 }],
      },
    });
  });

  it.each([
    ['pickup_pix', 'PIX'],
    ['pickup_card', 'CARTAO'],
    ['pickup_cash', 'DINHEIRO'],
  ] as const)(
    'cria retirada %s como não paga e usa o WhatsApp do carrinho',
    (paymentMethod, expectedMethod) => {
      writeWhatsappOrderPhone(7, '(85) 99999-9999');
      const result = buildOrderPayload({
        restaurantId: 7,
        type: 'RETIRADA',
        paymentMethod,
        cart: [{ productId: '12', name: 'Pizza', price: 39.9, quantity: 1, image: '' }],
        customer: { name: 'Samuel', phone: '(11) 98888-7777' },
        deliveryAddress: address,
      });

      expect(result).toMatchObject({
        payOnDelivery: false,
        payAtPickup: true,
        resolvedPaymentMethod: expectedMethod,
        payload: {
          type: 'RETIRADA',
          payOnDelivery: false,
          payOnDeliveryMethod: expectedMethod,
          customerPhone: '(85) 99999-9999',
        },
      });
      expect(result.payload).not.toHaveProperty('paymentMethod');
    },
  );

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
    expect(order.payload).not.toHaveProperty('whatsappOptIn');
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

  it('ignora telefone antigo do perfil e usa exclusivamente o número informado no carrinho', () => {
    writeWhatsappOrderPhone(7, '(85) 99999-9999');
    const order = buildOrderPayload({
      restaurantId: 7,
      type: 'RETIRADA',
      paymentMethod: 'pix',
      cart: [{ productId: '12', name: 'Pizza', price: 39.9, quantity: 1, image: '' }],
      customer: { phone: '(11) 98888-7777' },
      deliveryAddress: address,
    });

    expect(readWhatsappOrderPhone(7)).toBe('(85) 99999-9999');
    expect(order.payload.customerPhone).toBe('(85) 99999-9999');
  });

  it('mantém opt-in e telefone de WhatsApp isolados por restaurante', () => {
    writeWhatsappOrderPhone(7, '(85) 99999-9999');
    writeWhatsappOrderPhone(8, '(11) 98888-7777');
    writeWhatsappOrderOptIn(7, true);
    writeWhatsappOrderOptIn(8, false);

    expect(readWhatsappOrderPhone(7)).toBe('(85) 99999-9999');
    expect(readWhatsappOrderPhone(8)).toBe('(11) 98888-7777');
    expect(readWhatsappOrderOptIn(7)).toBe(true);
    expect(readWhatsappOrderOptIn(8)).toBe(false);

    const order = buildOrderPayload({
      restaurantId: 7,
      type: 'RETIRADA',
      paymentMethod: 'pix',
      cart: [{ productId: '12', name: 'Pizza', price: 39.9, quantity: 1, image: '' }],
      customer: { name: 'Samuel' },
      deliveryAddress: address,
    });

    expect(order.payload.whatsappOptIn).toBe(true);
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
