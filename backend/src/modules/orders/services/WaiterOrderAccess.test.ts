// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import {
  FuncionarioSubRole,
  OrderStatus,
  OrderType,
  PaymentMethod,
  UserRole,
} from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { OrderPermissions } from '../permissions/orderPermissions.js';
import getOrderByIdService from './GetOrderByIdService.js';
import listOrdersService from './ListOrdersService.js';
import updateOrderStatusService from './UpdateOrderStatusService.js';

const originals = {
  findAll: orderRepository.findAll,
  findReady: orderRepository.findReadyTableOrders,
  findReadyById: orderRepository.findReadyTableOrderById,
  findDeliverableById: orderRepository.findDeliverableTableOrderById,
  findOperationalById: orderRepository.findOperationalById,
  findById: orderRepository.findById,
  updateStatusIfCurrent: orderRepository.updateStatusIfCurrent,
  confirmPayment: orderRepository.confirmPayment,
  transaction: prisma.$transaction,
  settingsFindUnique: prisma.restaurantSettings.findUnique,
  ioTo: io.to,
};

afterEach(() => {
  orderRepository.findAll = originals.findAll;
  orderRepository.findReadyTableOrders = originals.findReady;
  orderRepository.findReadyTableOrderById = originals.findReadyById;
  orderRepository.findDeliverableTableOrderById = originals.findDeliverableById;
  orderRepository.findOperationalById = originals.findOperationalById;
  orderRepository.findById = originals.findById;
  orderRepository.updateStatusIfCurrent = originals.updateStatusIfCurrent;
  orderRepository.confirmPayment = originals.confirmPayment;
  prisma.$transaction = originals.transaction;
  prisma.restaurantSettings.findUnique = originals.settingsFindUnique;
  io.to = originals.ioTo;
});

test('garçom lista somente pedidos MESA prontos do próprio restaurante', async () => {
  let genericCalled = false;
  orderRepository.findAll = async () => {
    genericCalled = true;
    return [];
  };
  orderRepository.findReadyTableOrders = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return [{ id: 101, type: OrderType.MESA, status: OrderStatus.PRONTO }];
  };

  const result = await listOrdersService.execute(
    7,
    undefined,
    UserRole.FUNCIONARIO,
    44,
    FuncionarioSubRole.GARCOM,
  );

  assert.equal(genericCalled, false);
  assert.equal(result[0].id, 101);

  const incompatibleStatus = await listOrdersService.execute(
    7,
    OrderStatus.PENDENTE,
    UserRole.FUNCIONARIO,
    44,
    FuncionarioSubRole.GARCOM,
  );
  assert.deepEqual(incompatibleStatus, []);
});

test('detalhe do garçom usa consulta segura MESA/PRONTO e não a consulta administrativa', async () => {
  let genericCalled = false;
  orderRepository.findById = async () => {
    genericCalled = true;
  };
  orderRepository.findReadyTableOrderById = async (id, restaurantId) => {
    assert.deepEqual([Number(id), restaurantId], [101, 7]);
    return {
      id: 101,
      restaurantId: 7,
      type: OrderType.MESA,
      status: OrderStatus.PRONTO,
      user: { id: 8, name: 'Cliente' },
    };
  };

  const result = await getOrderByIdService.execute(
    101,
    7,
    UserRole.FUNCIONARIO,
    FuncionarioSubRole.GARCOM,
  );
  assert.equal(result.id, 101);
  assert.equal(genericCalled, false);

  orderRepository.findReadyTableOrderById = async () => null;
  await assert.rejects(
    () => getOrderByIdService.execute(101, 8, UserRole.FUNCIONARIO, FuncionarioSubRole.GARCOM),
    /não encontrado na fila do garçom/i,
  );
});

test('consulta pronta aplica tenant, canal, status, pagamento confirmado e resposta sem contato', async () => {
  let query;
  const fakeDb = {
    order: {
      findMany: async (args) => {
        query = args;
        return [];
      },
    },
  };

  await orderRepository.findReadyTableOrders(7, fakeDb);

  assert.equal(query.where.restaurantId, 7);
  assert.equal(query.where.type, OrderType.MESA);
  assert.equal(query.where.status, OrderStatus.PRONTO);
  assert.deepEqual(query.where.tableSession.is.status.in, ['OPEN', 'CLOSING_REQUESTED']);
  assert.equal(query.where.tableSession.is.restaurantId, 7);
  assert.equal(query.where.tableSession.is.OR[0].expiresAt, null);
  assert.ok(query.where.tableSession.is.OR[1].expiresAt.gt instanceof Date);
  assert.deepEqual(query.where.AND[0].OR[0], { settlementMode: 'TABLE_ACCOUNT' });
  assert.equal(query.where.AND[0].OR[1].NOT.paid, false);
  assert.equal(query.where.AND[0].OR[1].NOT.payOnDelivery, false);
  assert.deepEqual(query.where.AND[0].OR[1].NOT.paymentMethod.in, ['PIX', 'CARTAO']);
  assert.deepEqual(query.include.user.select, { id: true, name: true });
  assert.equal('phone' in query.include.user.select, false);
  assert.deepEqual(query.include.table.select, { id: true, number: true });
  assert.equal('token' in query.include.table.select, false);
  assert.deepEqual(query.orderBy, [{ readyAt: 'asc' }, { createdAt: 'asc' }]);
});

test('consulta de entrega exige pedido pronto em sessão ativa do mesmo restaurante', async () => {
  let query;
  const fakeDb = {
    order: {
      findFirst: async (args) => {
        query = args;
        return null;
      },
    },
  };

  await orderRepository.findDeliverableTableOrderById(101, 7, fakeDb);

  assert.equal(query.where.id, 101);
  assert.equal(query.where.restaurantId, 7);
  assert.equal(query.where.type, OrderType.MESA);
  assert.equal(query.where.status, OrderStatus.PRONTO);
  assert.equal(query.where.tableSession.is.restaurantId, 7);
  assert.deepEqual(query.where.tableSession.is.status.in, ['OPEN', 'CLOSING_REQUESTED']);
  assert.equal(query.where.tableSession.is.OR[0].expiresAt, null);
  assert.ok(query.where.tableSession.is.OR[1].expiresAt.gt instanceof Date);
});

test('fila da cozinha recebe o número correto da mesa sem expor o token do QR', async () => {
  let query;
  const fakeDb = {
    order: {
      findMany: async (args) => {
        query = args;
        return [
          {
            id: 101,
            restaurantId: 7,
            tableId: 91,
            table: { id: 91, number: 1, active: true, restaurantId: 7 },
          },
        ];
      },
    },
  };

  const orders = await orderRepository.findAll(7, undefined, fakeDb);

  assert.equal(query.where.restaurantId, 7);
  assert.equal(query.include.table.select.number, true);
  assert.equal('token' in query.include.table.select, false);
  assert.equal(orders[0].table.number, 1);
});

test('cozinha consulta detalhe pela visão operacional e exige subperfil válido', async () => {
  let genericCalled = false;
  orderRepository.findById = async () => {
    genericCalled = true;
    return null;
  };
  orderRepository.findOperationalById = async (id, restaurantId) => {
    assert.deepEqual([Number(id), restaurantId], [104, 7]);
    return { id: 104, restaurantId: 7, status: OrderStatus.PENDENTE };
  };

  const order = await getOrderByIdService.execute(
    104,
    7,
    UserRole.FUNCIONARIO,
    FuncionarioSubRole.COZINHA,
  );
  assert.equal(order.id, 104);
  assert.equal(genericCalled, false);

  await assert.rejects(
    () => getOrderByIdService.execute(104, 7, UserRole.FUNCIONARIO, null),
    /perfil operacional válido/i,
  );
  await assert.rejects(
    () => listOrdersService.execute(7, undefined, UserRole.FUNCIONARIO, 44, null),
    /perfil operacional válido/i,
  );
});

test('garçom altera somente para ENTREGUE; cozinha continua limitada ao preparo', () => {
  assert.equal(
    OrderPermissions.canUserChangeStatus(
      UserRole.FUNCIONARIO,
      OrderStatus.ENTREGUE,
      FuncionarioSubRole.GARCOM,
    ),
    true,
  );
  assert.equal(
    OrderPermissions.canUserChangeStatus(
      UserRole.FUNCIONARIO,
      OrderStatus.PRONTO,
      FuncionarioSubRole.GARCOM,
    ),
    false,
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

test('garçom entrega somente pedido MESA/PRONTO sem confirmar pagamento automaticamente', async () => {
  const readyOrder = {
    id: 101,
    restaurantId: 7,
    userId: null,
    type: OrderType.MESA,
    status: OrderStatus.PRONTO,
    paid: false,
    paymentMethod: PaymentMethod.DINHEIRO,
    payOnDelivery: false,
    observation: null,
    user: null,
    restaurant: { id: 7, name: 'Restaurante', whatsapp: null },
    table: { id: 91, number: 1, active: true, restaurantId: 7 },
    participant: { id: 51, publicId: 'participant', displayName: 'Cliente da mesa' },
    items: [{ id: 1, quantity: 1, product: { id: 10, name: 'Produto' } }],
  };
  const tx = {
    order: {
      update: async ({ where, data }) => {
        assert.equal(where.id, 101);
        assert.ok(data.deliveredAt instanceof Date);
        return { ...readyOrder, status: OrderStatus.ENTREGUE, deliveredAt: data.deliveredAt };
      },
    },
  };
  let confirmPaymentCalls = 0;

  orderRepository.findDeliverableTableOrderById = async (id, restaurantId) => {
    assert.deepEqual([Number(id), restaurantId], [101, 7]);
    return readyOrder;
  };
  orderRepository.updateStatusIfCurrent = async (id, status, restaurantId, expected, db) => {
    assert.deepEqual([Number(id), status, restaurantId], [101, OrderStatus.ENTREGUE, 7]);
    assert.deepEqual(expected, { status: OrderStatus.PRONTO, paid: false });
    assert.equal(db, tx);
    return { ...readyOrder, status };
  };
  orderRepository.confirmPayment = async () => {
    confirmPaymentCalls += 1;
    return { ...readyOrder, status: OrderStatus.ENTREGUE, paid: true };
  };
  prisma.$transaction = async (callback) => callback(tx);
  prisma.restaurantSettings.findUnique = async () => null;
  io.to = () => ({ emit() {} });

  const result = await updateOrderStatusService.execute(
    101,
    7,
    OrderStatus.ENTREGUE,
    UserRole.FUNCIONARIO,
    undefined,
    44,
    FuncionarioSubRole.GARCOM,
  );

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(result.status, OrderStatus.ENTREGUE);
  assert.equal(result.paid, false);
  assert.equal(confirmPaymentCalls, 0);
});

test('garçom não entrega outro canal, pedido não pronto ou altera para outro status', async () => {
  let updateCalls = 0;
  orderRepository.updateStatusIfCurrent = async () => {
    updateCalls += 1;
  };

  const invalidAttempts = [
    {
      type: OrderType.DELIVERY,
      currentStatus: OrderStatus.PRONTO,
      targetStatus: OrderStatus.ENTREGUE,
    },
    {
      type: OrderType.MESA,
      currentStatus: OrderStatus.SAIU_PARA_ENTREGA,
      targetStatus: OrderStatus.ENTREGUE,
    },
    {
      type: OrderType.MESA,
      currentStatus: OrderStatus.PRONTO,
      targetStatus: OrderStatus.SAIU_PARA_ENTREGA,
    },
  ];

  for (const attempt of invalidAttempts) {
    orderRepository.findDeliverableTableOrderById = async () => ({
      id: 101,
      restaurantId: 7,
      userId: null,
      type: attempt.type,
      status: attempt.currentStatus,
      paid: true,
      paymentMethod: PaymentMethod.DINHEIRO,
      payOnDelivery: false,
      observation: null,
    });

    await assert.rejects(
      () =>
        updateOrderStatusService.execute(
          101,
          7,
          attempt.targetStatus,
          UserRole.FUNCIONARIO,
          undefined,
          44,
          FuncionarioSubRole.GARCOM,
        ),
      /garçom só pode marcar como entregue um pedido de mesa que esteja pronto/i,
    );
  }

  assert.equal(updateCalls, 0);
});

test('garçom não entrega pedido pronto cuja sessão de mesa já encerrou ou expirou', async () => {
  let updateCalls = 0;
  orderRepository.findDeliverableTableOrderById = async () => null;
  orderRepository.updateStatusIfCurrent = async () => {
    updateCalls += 1;
  };

  await assert.rejects(
    () =>
      updateOrderStatusService.execute(
        101,
        7,
        OrderStatus.ENTREGUE,
        UserRole.FUNCIONARIO,
        undefined,
        44,
        FuncionarioSubRole.GARCOM,
      ),
    /sessão de mesa ativa/i,
  );
  assert.equal(updateCalls, 0);
});
