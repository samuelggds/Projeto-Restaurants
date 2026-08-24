// @ts-nocheck
import assert from 'node:assert/strict';
import http from 'node:http';
import test, { afterEach } from 'node:test';
import {
  FuncionarioSubRole,
  OrderStatus,
  OrderType,
  PaymentMethod,
  UserRole,
} from '@prisma/client';
import orderRepository from '../repositories/OrderRepository.js';
import { OrderPermissions } from '../permissions/orderPermissions.js';
import { OrderStateMachine } from '../state/orderStateMachine.js';
import {
  emitTableSessionOrderEvent,
  emitWaiterTableOrderEvent,
} from '../utils/waiterOrderRealtime.js';
import listOrdersService from './ListOrdersService.js';

const originalHttpCreateServer = http.createServer;
http.createServer = ((...args) => {
  const server = originalHttpCreateServer(...args);
  server.listen = () => server;
  return server;
}) as typeof http.createServer;

const { default: updateOrderStatusService } = await import('./UpdateOrderStatusService.js');
http.createServer = originalHttpCreateServer;

const originals = {
  findAll: orderRepository.findAll,
  findById: orderRepository.findById,
  updateStatusIfCurrent: orderRepository.updateStatusIfCurrent,
};

afterEach(() => {
  orderRepository.findAll = originals.findAll;
  orderRepository.findById = originals.findById;
  orderRepository.updateStatusIfCurrent = originals.updateStatusIfCurrent;
});

test('fila da cozinha mantém MESA, RETIRADA e DELIVERY do mesmo tenant com itens completos', async () => {
  const expected = [
    {
      id: 1,
      restaurantId: 7,
      type: OrderType.MESA,
      table: { id: 91, number: 1, restaurantId: 7 },
      items: [
        {
          quantity: 2,
          observation: 'Sem cortar',
          ingredients: [{ id: 11, name: 'Massa fina', price: 0 }],
          customizations: [
            { groupName: 'Massa', options: [{ optionId: 101, name: 'Massa fina' }] },
          ],
          product: { id: 10, name: 'Pizza da casa' },
        },
      ],
    },
    { id: 2, restaurantId: 7, type: OrderType.RETIRADA, items: [] },
    { id: 3, restaurantId: 7, type: OrderType.DELIVERY, items: [] },
  ];
  orderRepository.findAll = async (restaurantId, status) => {
    assert.equal(restaurantId, 7);
    assert.equal(status, undefined);
    return expected;
  };

  const result = await listOrdersService.execute(
    7,
    undefined,
    UserRole.FUNCIONARIO,
    44,
    FuncionarioSubRole.COZINHA,
  );

  assert.deepEqual(
    result.map((order) => order.type),
    [OrderType.MESA, OrderType.RETIRADA, OrderType.DELIVERY],
  );
  assert.equal(result[0].table.number, 1);
  assert.equal(result[0].items[0].quantity, 2);
  assert.equal(result[0].items[0].observation, 'Sem cortar');
  assert.equal(result[0].items[0].customizations[0].groupName, 'Massa');
  assert.equal(result[0].items[0].product.name, 'Pizza da casa');
});

test('consulta operacional aplica tenant e oculta PIX/cartão online ainda não pagos', async () => {
  let query;
  const fakeDb = {
    order: {
      findFirst: async (args) => {
        query = args;
        return null;
      },
    },
  };

  await orderRepository.findOperationalById(81, 7, fakeDb);

  assert.equal(query.where.id, 81);
  assert.equal(query.where.restaurantId, 7);
  assert.equal(query.where.NOT.paid, false);
  assert.equal(query.where.NOT.payOnDelivery, false);
  assert.deepEqual(query.where.NOT.paymentMethod.in, [PaymentMethod.PIX, PaymentMethod.CARTAO]);
  assert.equal(query.include.items.include.product, true);
  assert.equal(query.include.table.select.number, true);
  assert.equal('token' in query.include.table.select, false);
});

test('pagamento digital não confirmado não avança na cozinha em nenhum canal', async () => {
  let updateCalls = 0;
  orderRepository.updateStatusIfCurrent = async () => {
    updateCalls += 1;
  };

  for (const [type, paymentMethod] of [
    [OrderType.MESA, PaymentMethod.PIX],
    [OrderType.RETIRADA, PaymentMethod.CARTAO],
    [OrderType.DELIVERY, PaymentMethod.PIX],
  ]) {
    orderRepository.findById = async (id, restaurantId) => ({
      id: Number(id),
      restaurantId,
      userId: 12,
      status: OrderStatus.PENDENTE,
      type,
      paymentMethod,
      payOnDelivery: false,
      paid: false,
      observation: null,
    });

    await assert.rejects(
      () =>
        updateOrderStatusService.execute(
          81,
          7,
          OrderStatus.PREPARANDO,
          UserRole.FUNCIONARIO,
          undefined,
          44,
          FuncionarioSubRole.COZINHA,
        ),
      /pagamento digital pendente.*PENDENTE/i,
    );
  }

  assert.equal(updateCalls, 0);
});

test('máquina de estados e permissão restringem a cozinha a PENDENTE → PREPARANDO → PRONTO', () => {
  assert.equal(OrderStateMachine.canTransition(OrderStatus.PENDENTE, OrderStatus.PREPARANDO), true);
  assert.equal(OrderStateMachine.canTransition(OrderStatus.PREPARANDO, OrderStatus.PRONTO), true);
  assert.equal(OrderStateMachine.canTransition(OrderStatus.PENDENTE, OrderStatus.PRONTO), false);
  assert.equal(OrderStateMachine.canTransition(OrderStatus.PRONTO, OrderStatus.PREPARANDO), false);

  assert.equal(
    OrderPermissions.canUserChangeStatus(
      UserRole.FUNCIONARIO,
      OrderStatus.PREPARANDO,
      FuncionarioSubRole.COZINHA,
    ),
    true,
  );
  assert.equal(
    OrderPermissions.canUserChangeStatus(
      UserRole.FUNCIONARIO,
      OrderStatus.PRONTO,
      FuncionarioSubRole.COZINHA,
    ),
    true,
  );
  assert.equal(
    OrderPermissions.canUserChangeStatus(
      UserRole.FUNCIONARIO,
      OrderStatus.ENTREGUE,
      FuncionarioSubRole.COZINHA,
    ),
    false,
  );
});

test('CAS do status prende tenant, estado e pagamento e grava os relógios da cozinha', async () => {
  const queries = [];
  const fakeDb = {
    order: {
      updateMany: async (args) => {
        queries.push(args);
        return { count: 1 };
      },
      findFirst: async ({ where }) => ({
        id: where.id,
        restaurantId: where.restaurantId,
        status: queries.at(-1).data.status,
      }),
    },
  };

  await orderRepository.updateStatusIfCurrent(
    81,
    OrderStatus.PREPARANDO,
    7,
    { status: OrderStatus.PENDENTE, paid: true },
    fakeDb,
  );
  await orderRepository.updateStatusIfCurrent(
    81,
    OrderStatus.PRONTO,
    7,
    { status: OrderStatus.PREPARANDO, paid: true },
    fakeDb,
  );

  assert.deepEqual(queries[0].where, {
    id: 81,
    restaurantId: 7,
    status: OrderStatus.PENDENTE,
    paid: true,
  });
  assert.ok(queries[0].data.preparationStartedAt instanceof Date);
  assert.equal(queries[0].data.readyAt, null);
  assert.deepEqual(queries[1].where, {
    id: 81,
    restaurantId: 7,
    status: OrderStatus.PREPARANDO,
    paid: true,
  });
  assert.ok(queries[1].data.readyAt instanceof Date);
});

test('pedido MESA chega ao garçom e à sessão apenas pelas rooms específicas', () => {
  const emissions = [];
  const io = {
    to(room) {
      return {
        emit(event, payload) {
          emissions.push({ room, event, payload });
        },
      };
    },
  };
  const tableOrder = {
    id: 81,
    restaurantId: 7,
    type: OrderType.MESA,
    status: OrderStatus.PENDENTE,
    createdAt: new Date('2026-08-24T18:00:00.000Z'),
    table: { id: 91, number: 1, token: 'never-expose' },
    user: {
      id: 12,
      name: 'Cliente',
      email: 'private@example.com',
      phone: '5511999999999',
    },
    items: [
      {
        id: 5,
        quantity: 2,
        observation: 'Sem cortar',
        ingredients: [{ id: 11, name: 'Massa fina', price: 0 }],
        customizations: [],
        product: { id: 10, name: 'Pizza', description: 'internal' },
      },
    ],
  };

  assert.equal(emitWaiterTableOrderEvent(io, 'new-order', tableOrder), true);
  assert.equal(emitTableSessionOrderEvent(io, 'new-order', tableOrder), true);
  assert.deepEqual(
    emissions.map(({ room, event }) => ({ room, event })),
    [
      { room: 'restaurant:7:waiter', event: 'new-order' },
      { room: 'table:91', event: 'new-order' },
    ],
  );
  assert.equal(
    emissions.some(({ room }) => room === 'restaurant:7'),
    false,
  );
  assert.equal(emissions[0].payload.table.token, undefined);
  assert.equal(emissions[0].payload.customer.email, undefined);
  assert.equal(emissions[0].payload.customer.phone, undefined);
  assert.deepEqual(emissions[0].payload.items[0].product, { id: 10, name: 'Pizza' });
  assert.equal(emissions[1].payload.customer, undefined);
  assert.equal(emissions[1].payload.items, undefined);
  assert.deepEqual(emissions[1].payload.table, { id: 91, number: 1 });

  for (const type of [OrderType.DELIVERY, OrderType.RETIRADA]) {
    const countBefore = emissions.length;
    const order = { ...tableOrder, type };
    assert.equal(emitWaiterTableOrderEvent(io, 'new-order', order), false);
    assert.equal(emitTableSessionOrderEvent(io, 'order:status-changed', order), false);
    assert.equal(emissions.length, countBefore);
  }
});
