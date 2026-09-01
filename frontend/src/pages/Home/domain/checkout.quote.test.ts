import { describe, expect, it } from 'vitest';
import { buildOrderItems, buildOrderQuotePayload } from './checkout';
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

  it('envia somente a intenção avançada e a versão da configuração', () => {
    const [item] = buildOrderItems([
      {
        productId: '10',
        name: 'Produto controlado pelo catálogo',
        price: 1,
        image: '',
        quantity: 2,
        selectedOptionIds: ['21'],
        selectedOptions: [{ groupId: '5', optionIds: ['21'] }],
        optionQuantities: [{ optionId: '21', quantity: 3 }],
        options: [
          {
            id: '21',
            groupId: '5',
            groupName: 'Adicionais',
            name: 'Nome não confiável',
            price: 0.01,
          },
        ],
        removedCompositionItemIds: ['31'],
        portions: [{ optionId: '41', name: 'Nome local', observation: 'bem passada' }],
        configurationVersion: 7,
      },
    ]);

    expect(item).toEqual({
      productId: 10,
      quantity: 2,
      optionIds: [21],
      selectedOptions: [{ groupId: 5, optionIds: [21] }],
      optionQuantities: [{ optionId: 21, quantity: 3 }],
      removedCompositionItemIds: [31],
      portions: [{ optionId: 41, observation: 'bem passada' }],
      configurationVersion: 7,
    });
    expect(item).not.toHaveProperty('price');
    expect(item).not.toHaveProperty('options');
  });
});
