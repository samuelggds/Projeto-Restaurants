import { describe, expect, it } from 'vitest';
import { buildOrderQuotePayload } from './checkout';
import type { CartItem } from '../hooks/useCart';

const cart: CartItem[] = [
  {
    productId: '10',
    name: 'Pizza de teste',
    price: 40,
    image: '',
    quantity: 1,
    selectedOptionIds: [],
    selectedOptions: [],
    ingredientIds: [],
    observation: '',
  },
];

const deliveryAddress = {
  address: 'Rua Teste',
  number: '123',
  district: 'Centro',
  city: 'Fortaleza',
  state: 'ce',
  zipCode: '60000-000',
  complement: 'Apto 10',
};

describe('buildOrderQuotePayload', () => {
  it('envia o endereço para cotação de delivery', () => {
    expect(
      buildOrderQuotePayload({
        restaurantId: 7,
        type: 'DELIVERY',
        cart,
        deliveryAddress,
      }),
    ).toEqual({
      restaurantId: 7,
      type: 'DELIVERY',
      items: [{ productId: 10, quantity: 1 }],
      address: 'Rua Teste',
      number: '123',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
    });
  });

  it('não envia endereço para retirada', () => {
    expect(
      buildOrderQuotePayload({
        restaurantId: 7,
        type: 'RETIRADA',
        cart,
        deliveryAddress,
      }),
    ).toEqual({
      restaurantId: 7,
      type: 'RETIRADA',
      items: [{ productId: 10, quantity: 1 }],
    });
  });
});
