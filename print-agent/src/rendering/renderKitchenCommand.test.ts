import assert from 'node:assert/strict';
import test from 'node:test';

import { CHARACTER_WIDTH, renderKitchenCommand } from './renderKitchenCommand.js';
import type { KitchenOrderPrintPayloadV1 } from '../types.js';

const payload: KitchenOrderPrintPayloadV1 = {
  version: 1,
  kind: 'ORDER',
  restaurantName: 'North Pizza Restaurante',
  order: {
    publicId: 'f494b16c-caa8-44d0-81e5-88be728c59cc',
    displayNumber: '184',
    createdAt: '2026-08-31T22:42:00.000Z',
    type: 'DELIVERY',
    customerName: 'Maria de Souza',
    deliveryAddress: {
      address: 'Rua das Flores',
      number: '125',
      complement: 'Apto 302 - Bloco B',
      district: 'Aldeota',
      city: 'Fortaleza',
      state: 'CE',
      zipCode: '60150-000',
    },
    paid: true,
    paymentMethod: 'PIX',
    items: [
      {
        quantity: 2,
        name: 'X-Bacon artesanal grande',
        observation: 'SEM cebola e com o hambúrguer bem passado',
        customizations: [
          { groupName: 'Adicionais', options: ['Bacon crocante', 'Cheddar cremoso'] },
        ],
      },
    ],
    observation: 'Separar os molhos e identificar a embalagem',
    total: 87.5,
  },
};

for (const paperWidth of ['MM58', 'MM80'] as const) {
  test(`render ${paperWidth} respeita largura e mantém conteúdo operacional`, () => {
    const rendered = renderKitchenCommand(payload, paperWidth);
    assert.ok(rendered.split('\n').every((line) => line.length <= CHARACTER_WIDTH[paperWidth]));
    assert.match(rendered, /PEDIDO #184/u);
    assert.match(rendered, /CLIENTE: Maria de Souza/u);
    assert.match(rendered, /2x X-BACON/u);
    assert.match(rendered, /Bacon crocante/u);
    assert.match(rendered, /Cheddar cremoso/u);
    assert.match(rendered, /SEM cebola/u);
    assert.match(rendered, /ENTREGA:/u);
    assert.match(rendered, /Rua das Flores, 125/u);
    assert.match(rendered, /Apto 302 - Bloco B/u);
    assert.match(rendered, /Bairro Aldeota/u);
    assert.match(rendered, /Fortaleza - CE/u);
    assert.match(rendered, /CEP: 60150-000/u);
    assert.match(rendered, /R\$ 87,50/u);
  });
}

test('render de mesa destaca mesa e cliente juntos sem duplicar identificação', () => {
  const rendered = renderKitchenCommand(
    {
      ...payload,
      order: {
        ...payload.order,
        type: 'MESA',
        tableNumber: 1,
        customerName: 'Samuel Gomes',
      },
    },
    'MM80',
  );
  assert.match(rendered, /MESA 01 • Samuel Gomes/u);
  assert.doesNotMatch(rendered, /CLIENTE: Samuel Gomes/u);
  assert.doesNotMatch(rendered, /Rua das Flores|ENTREGA:/u);
  assert.doesNotMatch(rendered, /https?:|<img|font-family/iu);
});

test('render de mesa sem nome ainda destaca o número da mesa', () => {
  const rendered = renderKitchenCommand(
    {
      ...payload,
      order: {
        ...payload.order,
        type: 'MESA',
        tableNumber: 7,
        customerName: undefined,
      },
    },
    'MM58',
  );
  assert.match(rendered, /MESA 07/u);
  assert.doesNotMatch(rendered, /CLIENTE:/u);
});

test('render de retirada destaca retirada local e mantém cliente separado', () => {
  const rendered = renderKitchenCommand(
    {
      ...payload,
      order: { ...payload.order, type: 'RETIRADA' },
    },
    'MM80',
  );
  assert.match(rendered, /TIPO: RETIRADA/u);
  assert.match(rendered, /CLIENTE: Maria de Souza/u);
  assert.match(rendered, /RETIRADA NO LOCAL/u);
  assert.doesNotMatch(rendered, /Rua das Flores|ENTREGA:/u);
});

test('render de DELIVERY omite linhas vazias do endereço', () => {
  const rendered = renderKitchenCommand(
    {
      ...payload,
      order: {
        ...payload.order,
        deliveryAddress: {
          address: 'Rua das Flores',
          number: '125',
          complement: '   ',
          district: 'Aldeota',
          city: 'Fortaleza',
          state: 'CE',
        },
      },
    },
    'MM80',
  );
  const addressBlock = rendered.slice(rendered.indexOf('ENTREGA:'), rendered.indexOf('# TOTAL:'));
  assert.match(addressBlock, /Rua das Flores, 125/u);
  assert.match(addressBlock, /Bairro Aldeota/u);
  assert.match(addressBlock, /Fortaleza - CE/u);
  assert.doesNotMatch(addressBlock, /CEP:/u);
  assert.doesNotMatch(addressBlock, /\n\s*\n/u);
});

for (const paperWidth of ['MM58', 'MM80'] as const) {
  test(`render ${paperWidth} apresenta quantidades, remoções e porções sem estourar a bobina`, () => {
    const rendered = renderKitchenCommand(
      {
        ...payload,
        order: {
          ...payload.order,
          items: [
            {
              quantity: 1,
              name: 'Produto dividido',
              customizations: [{ groupName: 'Adicionais', options: ['2x Bacon crocante'] }],
              removedItems: ['Cebola roxa'],
              portions: [
                { fraction: '1/2', optionName: 'Calabresa', observation: 'Sem cebola' },
                { fraction: '1/2', optionName: 'Portuguesa' },
              ],
              observation: 'Massa bem passada',
            },
          ],
        },
      },
      paperWidth,
    );

    assert.ok(rendered.split('\n').every((line) => line.length <= CHARACTER_WIDTH[paperWidth]));
    assert.match(rendered, /PORÇÕES/u);
    assert.match(rendered, /1\/2 Calabresa/u);
    assert.match(rendered, /OBS: Sem cebola/u);
    assert.match(rendered, /2x Bacon crocante/u);
    assert.match(rendered, /RETIRAR/u);
    assert.match(rendered, /Cebola roxa/u);
    assert.match(rendered, /Massa bem passada/u);
  });
}

test('render TEST contém identificação e confirmação de conexão', () => {
  const rendered = renderKitchenCommand(
    {
      version: 1,
      kind: 'TEST',
      restaurantName: 'North Pizza',
      requestedAt: '2026-08-31T22:30:00.000Z',
      message: 'Conexão com a impressora OK.',
    },
    'MM58',
  );
  assert.match(rendered, /TESTE DE IMPRESSÃO/u);
  assert.match(rendered, /Conexão com a impressora OK/u);
});
