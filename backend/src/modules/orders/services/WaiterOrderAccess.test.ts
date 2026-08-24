// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { FuncionarioSubRole, OrderStatus, OrderType, UserRole } from '@prisma/client';
import orderRepository from '../repositories/OrderRepository.js';
import { OrderPermissions } from '../permissions/orderPermissions.js';
import getOrderByIdService from './GetOrderByIdService.js';
import listOrdersService from './ListOrdersService.js';

const originals = {
  findAll: orderRepository.findAll,
  findReady: orderRepository.findReadyTableOrders,
  findReadyById: orderRepository.findReadyTableOrderById,
  findOperationalById: orderRepository.findOperationalById,
  findById: orderRepository.findById,
};

afterEach(() => {
  orderRepository.findAll = originals.findAll;
  orderRepository.findReadyTableOrders = originals.findReady;
  orderRepository.findReadyTableOrderById = originals.findReadyById;
  orderRepository.findOperationalById = originals.findOperationalById;
  orderRepository.findById = originals.findById;
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
  assert.deepEqual(query.where.NOT.paymentMethod.in, ['PIX', 'CARTAO']);
  assert.deepEqual(query.include.user.select, { id: true, name: true });
  assert.equal('phone' in query.include.user.select, false);
  assert.deepEqual(query.include.table.select, { id: true, number: true });
  assert.equal('token' in query.include.table.select, false);
  assert.deepEqual(query.orderBy, [{ readyAt: 'asc' }, { createdAt: 'asc' }]);
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

test('garçom não altera status; cozinha continua limitada ao preparo', () => {
  assert.equal(
    OrderPermissions.canUserChangeStatus(
      UserRole.FUNCIONARIO,
      OrderStatus.ENTREGUE,
      FuncionarioSubRole.GARCOM,
    ),
    false,
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
