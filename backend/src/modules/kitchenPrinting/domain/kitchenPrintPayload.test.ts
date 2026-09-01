import assert from 'node:assert/strict';
import test from 'node:test';

import { OrderType, PaymentMethod } from '@prisma/client';

import {
  buildKitchenOrderPayload,
  buildKitchenTestPayload,
  normalizeKitchenItemCustomizations,
  sanitizeKitchenObservation,
} from './kitchenPrintPayload.js';

test('payload V1 preserva customizações da cozinha e remove CPF da observação', () => {
  const payload = buildKitchenOrderPayload({
    id: 184,
    publicId: 'b22d86bf-b9f8-4e72-9461-f8db63a1fa07',
    createdAt: new Date('2026-08-31T22:42:00.000Z'),
    type: OrderType.DELIVERY,
    paid: true,
    paymentMethod: PaymentMethod.PIX,
    payOnDeliveryMethod: null,
    total: 87.5,
    observation: 'Cliente: Maria | CPF: 123.456.789-00 | Hambúrguer bem passado',
    address: 'Rua das Flores',
    number: '125',
    complement: 'Apto 302 - Bloco B',
    district: 'Aldeota',
    city: 'Fortaleza',
    state: 'CE',
    zipCode: '60150-000',
    restaurant: { name: 'North Pizza' },
    table: null,
    user: { name: 'Maria' },
    participant: null,
    items: [
      {
        quantity: 2,
        observation: 'SEM cebola',
        ingredients: [],
        customizations: [
          { groupName: 'Adicionais', options: [{ name: 'Bacon' }, { label: 'Cheddar' }] },
        ],
        product: { name: 'X-Bacon' },
      },
    ],
  });

  assert.equal(payload.version, 1);
  assert.equal(payload.order.items[0].customizations[0].groupName, 'Adicionais');
  assert.deepEqual(payload.order.items[0].customizations[0].options, ['Bacon', 'Cheddar']);
  assert.equal(payload.order.observation, 'Hambúrguer bem passado');
  assert.equal(payload.order.items[0].observation, 'SEM cebola');
  assert.deepEqual(payload.order.deliveryAddress, {
    address: 'Rua das Flores',
    number: '125',
    complement: 'Apto 302 - Bloco B',
    district: 'Aldeota',
    city: 'Fortaleza',
    state: 'CE',
    zipCode: '60150-000',
  });
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /CPF|123[.]456[.]789|password|token|secret/iu);
});

test('payload usa endereço persistido somente em DELIVERY', () => {
  const baseOrder = {
    id: 185,
    publicId: 'c22d86bf-b9f8-4e72-9461-f8db63a1fa08',
    createdAt: new Date('2026-08-31T22:42:00.000Z'),
    paid: false,
    paymentMethod: PaymentMethod.DINHEIRO,
    payOnDeliveryMethod: null,
    total: 42,
    observation: null,
    address: 'Rua exclusiva da entrega',
    number: '98',
    complement: '',
    district: 'Centro',
    city: 'Fortaleza',
    state: 'CE',
    zipCode: null,
    restaurant: { name: 'Nome comercial' },
    table: null,
    user: { name: 'Cliente' },
    participant: null,
    items: [],
  };

  const delivery = buildKitchenOrderPayload({ ...baseOrder, type: OrderType.DELIVERY });
  assert.deepEqual(delivery.order.deliveryAddress, {
    address: 'Rua exclusiva da entrega',
    number: '98',
    district: 'Centro',
    city: 'Fortaleza',
    state: 'CE',
  });

  for (const type of [OrderType.MESA, OrderType.RETIRADA]) {
    const payload = buildKitchenOrderPayload({ ...baseOrder, type });
    assert.equal(payload.order.deliveryAddress, undefined);
    assert.doesNotMatch(JSON.stringify(payload), /Rua exclusiva da entrega/u);
  }
});

test('customização legada de ingredients mantém o mesmo fallback da cozinha', () => {
  assert.deepEqual(
    normalizeKitchenItemCustomizations({
      customizations: null,
      ingredients: ['Mussarela', { ingredient: { name: 'Tomate' } }, 'Mussarela'],
    }),
    [{ groupName: 'Itens escolhidos', options: ['Mussarela', 'Tomate'] }],
  );
});

test('sanitização e payload TEST não carregam dados de pedido', () => {
  assert.equal(sanitizeKitchenObservation('CPF: 12345678900 | Sem gelo'), 'Sem gelo');
  const payload = buildKitchenTestPayload('North Pizza', new Date('2026-08-31T22:30:00Z'));
  assert.deepEqual(payload, {
    version: 1,
    kind: 'TEST',
    restaurantName: 'North Pizza',
    requestedAt: '2026-08-31T22:30:00.000Z',
    message: 'Conexão com a impressora OK.',
  });
});
