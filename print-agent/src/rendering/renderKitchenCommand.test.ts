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
    assert.match(rendered, /2x X-BACON/u);
    assert.match(rendered, /Bacon crocante/u);
    assert.match(rendered, /Cheddar cremoso/u);
    assert.match(rendered, /SEM cebola/u);
    assert.match(rendered, /R\$ 87,50/u);
  });
}

test('render de mesa destaca mesa e não depende de imagem ou fonte externa', () => {
  const rendered = renderKitchenCommand(
    {
      ...payload,
      order: { ...payload.order, type: 'MESA', tableNumber: 12 },
    },
    'MM80',
  );
  assert.match(rendered, /MESA 12/u);
  assert.doesNotMatch(rendered, /https?:|<img|font-family/iu);
});

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
